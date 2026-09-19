const mongoose = require("mongoose");
const Family = require("../../models/Family");
const FamilyMember = require("../../models/FamilyMember");
const FamilyMarriage = require("../../models/FamilyMarriage");
const { getSortedChildren, getMarriageChildIds, getMarriageChildrenRaw } = require("../../utils/getSortedChildren");
const {
  isValidObjectId,
  normalizeMemberPayload,
  assertFamilyByUser,
  assertFamilyOwner,
  assertMemberInFamily,
  assertMarriageInFamily,
  validateAddChildNoCycle,
  buildParentAdj,
  isAncestor,
  shareAnyParent,
  hasSharedAncestorWithin3Generations,
  isInLawConflict,
} = require("./familyValidationService");

/**
 * Atomic "check + create family" to fix race condition when multiple requests
 * ensure family for the same user. Uses findOneAndUpdate with upsert so exactly
 * one family document exists per (userId, isDeleted: false); preserves unique index.
 */
const createFamilyIfMissing = async ({ userId }) => {
  const doc = await Family.findOneAndUpdate(
    { userId, isDeleted: false },
    { $setOnInsert: { userId, isDeleted: false, isActive: true } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return doc;
};

const initFamilyWithRootCouple = async ({ userId, rootMale, rootFemale }) => {
  const family = await createFamilyIfMissing({ userId });

  // If already initialized with a root, keep backward-compatible and do nothing.
  if (family.rootMemberId || family.rootMarriageId) {
    return { family, created: false };
  }

  const malePayload = rootMale ? normalizeMemberPayload({ ...rootMale, gender: "male" }) : null;
  const femalePayload = rootFemale ? normalizeMemberPayload({ ...rootFemale, gender: "female" }) : null;

  if (!malePayload && !femalePayload) {
    return {
      error: {
        code: 400,
        errors: [{ msg: "Root member details are required" }],
      },
    };
  }

  const session = await mongoose.startSession();
  try {
    let rootMember = null;
    let spouseMember = null;
    let rootMarriage = null;

    await session.withTransaction(async () => {
      if (malePayload) {
        rootMember = await FamilyMember.create(
          [
            {
              ...malePayload,
              userId,
              familyId: family._id,
            },
          ],
          { session }
        ).then((arr) => arr[0]);
      }

      if (femalePayload) {
        spouseMember = await FamilyMember.create(
          [
            {
              ...femalePayload,
              userId,
              familyId: family._id,
            },
          ],
          { session }
        ).then((arr) => arr[0]);
      }

      // If both exist, create a root marriage to represent the root couple
      if (rootMember && spouseMember) {
        rootMarriage = await FamilyMarriage.create(
          [
            {
              userId,
              familyId: family._id,
              spouse1Id: rootMember._id,
              spouse2Id: spouseMember._id,
              children: [],
              order: 0,
            },
          ],
          { session }
        ).then((arr) => arr[0]);
      }

      const rootMemberId = rootMember ? rootMember._id : spouseMember._id;
      await Family.findByIdAndUpdate(
        family._id,
        {
          $set: {
            rootMemberId,
            rootMarriageId: rootMarriage ? rootMarriage._id : undefined,
          },
        },
        { session }
      );
    });

    session.endSession();

    const updated = await Family.findById(family._id).lean();
    return { family: updated, created: true };
  } catch (err) {
    session.endSession();
    return {
      error: { code: 500, errors: [{ msg: "An error occurred" }] },
    };
  }
};

/**
 * Flat list of members and marriages. Optional pagination for members only (avoids loading entire family).
 * When page/limit provided: members are paginated, totalMembers returned, marriages returned in full (typically fewer).
 */
const listFamilyFlat = async ({ userId, familyId, page, limit }) => {
  const memberFilter = { userId, familyId, isDeleted: false };
  const marriageFilter = { userId, familyId, isDeleted: false };
  const memberSort = { createdAt: 1 };
  const marriageSort = { order: 1, createdAt: 1 };

  if (page != null && limit != null && limit > 0) {
    const skip = Math.max(0, (Math.max(1, Math.floor(page)) - 1) * limit);
    const [members, totalMembers, marriages, allMembers] = await Promise.all([
      FamilyMember.find(memberFilter).sort(memberSort).skip(skip).limit(limit).lean(),
      FamilyMember.countDocuments(memberFilter),
      FamilyMarriage.find(marriageFilter).sort(marriageSort).lean(),
      FamilyMember.find(memberFilter).sort(memberSort).lean(),
    ]);
    const memberById = new Map(allMembers.map((m) => [String(m._id), m]));
    const marriagesWithSortedChildren = marriages.map((mar) => ({
      ...mar,
      sortedChildren: getSortedChildren(mar, memberById),
    }));
    return { members, marriages: marriagesWithSortedChildren, totalMembers, page: Math.max(1, Math.floor(page)), limit };
  }

  const [members, marriages] = await Promise.all([
    FamilyMember.find(memberFilter).sort(memberSort).lean(),
    FamilyMarriage.find(marriageFilter).sort(marriageSort).lean(),
  ]);
  const memberById = new Map(members.map((m) => [String(m._id), m]));
  const marriagesWithSortedChildren = marriages.map((mar) => ({
    ...mar,
    sortedChildren: getSortedChildren(mar, memberById),
  }));
  return { members, marriages: marriagesWithSortedChildren };
};

/** Build spousesOf: memberId -> Set of spouse ids. Optionally only from active marriages (for eligibility / remarriage). */
const buildSpousesOf = (marriages, { activeOnly = false } = {}) => {
  const spousesOf = new Map();
  for (const m of marriages || []) {
    if (activeOnly && (m.status || "active") !== "active") continue;
    const s1 = String(m.spouse1Id);
    const s2 = String(m.spouse2Id);
    if (!spousesOf.has(s1)) spousesOf.set(s1, new Set());
    if (!spousesOf.has(s2)) spousesOf.set(s2, new Set());
    spousesOf.get(s1).add(s2);
    spousesOf.get(s2).add(s1);
  }
  return spousesOf;
};

/**
 * Strict real-world marriage validation (biological + Sanatan rules).
 * Returns { ok: false } if marriage is prohibited, { ok: true } if allowed.
 * FIX 1: Cousin = any shared ancestor within 3 generations. FIX 2: In-law = spouse ancestor/descendant + spouse shares ancestor within 3 gen.
 */
const validateMarriageProhibited = ({ members, marriages, spouse1Id, spouse2Id }) => {
  const a = String(spouse1Id);
  const b = String(spouse2Id);
  const { parentsOf } = buildParentAdj({ marriages });
  const spousesOf = buildSpousesOf(marriages, { activeOnly: true });

  if (isAncestor({ parentsOf, nodeId: a, possibleAncestorId: b })) return { ok: false };
  if (isAncestor({ parentsOf, nodeId: b, possibleAncestorId: a })) return { ok: false };
  if (shareAnyParent(a, b, { parentsOf })) return { ok: false };
  if (hasSharedAncestorWithin3Generations(a, b, { parentsOf })) return { ok: false };
  if (isInLawConflict(a, b, { parentsOf, spousesOf })) return { ok: false };

  return { ok: true };
};

/**
 * Collect all ancestor ids by walking upward from nodeId.
 */
const collectAncestors = (nodeId, parentsOf) => {
  const out = new Set();
  const stack = [String(nodeId)];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    const parents = parentsOf.get(cur);
    if (!parents) continue;
    for (const p of parents) {
      out.add(p);
      stack.push(p);
    }
  }
  return out;
};

/**
 * Get member ids that are eligible to marry the given member (opposite gender, no prohibited relationship).
 */
const getEligibleSpouses = async ({ userId, familyId, memberId }) => {
  const memberCheck = await assertMemberInFamily({ userId, familyId, memberId });
  if (!memberCheck.ok) return { error: { code: memberCheck.code, errors: memberCheck.errors } };

  const [members, marriages] = await Promise.all([
    FamilyMember.find({ userId, familyId, isDeleted: false }).lean(),
    FamilyMarriage.find({ userId, familyId, isDeleted: false }).lean(),
  ]);

  const { parentsOf } = buildParentAdj({ marriages });
  const spousesOf = buildSpousesOf(marriages, { activeOnly: true });
  const memberById = new Map(members.map((m) => [String(m._id), m]));
  const x = String(memberId);
  const memberGender = (memberById.get(x)?.gender || "").toLowerCase();

  const isDeceased = (m) => m.isAlive === false;
  if (isDeceased(memberById.get(x))) {
    return { error: { code: 400, errors: [{ msg: "Deceased members cannot marry" }] } };
  }

  const ineligible = new Set([x]);

  const ancestorsX = collectAncestors(x, parentsOf);
  ancestorsX.forEach((id) => ineligible.add(id));

  members.forEach((m) => {
    const mid = String(m._id);
    if (mid === x) return;
    if (isAncestor({ parentsOf, nodeId: mid, possibleAncestorId: x })) ineligible.add(mid);
  });

  members.forEach((m) => {
    const mid = String(m._id);
    if (shareAnyParent(x, mid, { parentsOf })) ineligible.add(mid);
  });

  members.forEach((m) => {
    const mid = String(m._id);
    if (hasSharedAncestorWithin3Generations(x, mid, { parentsOf })) ineligible.add(mid);
  });

  const spousesX = spousesOf.get(x);
  if (spousesX) {
    spousesX.forEach((s) => ineligible.add(s));
    spousesX.forEach((s) => {
      collectAncestors(s, parentsOf).forEach((id) => ineligible.add(id));
      members.forEach((m) => {
        const mid = String(m._id);
        if (isAncestor({ parentsOf, nodeId: mid, possibleAncestorId: s })) ineligible.add(mid);
      });
      members.forEach((m) => {
        const mid = String(m._id);
        if (hasSharedAncestorWithin3Generations(s, mid, { parentsOf })) ineligible.add(mid);
      });
    });
  }

  members.forEach((m) => {
    const mid = String(m._id);
    if (mid === x || ineligible.has(mid)) return;
    const spousesM = spousesOf.get(mid);
    if (!spousesM) return;
    for (const s of spousesM) {
      if (isAncestor({ parentsOf, nodeId: x, possibleAncestorId: s }) || isAncestor({ parentsOf, nodeId: s, possibleAncestorId: x })) {
        ineligible.add(mid);
        return;
      }
      if (hasSharedAncestorWithin3Generations(x, s, { parentsOf }) || hasSharedAncestorWithin3Generations(s, x, { parentsOf })) {
        ineligible.add(mid);
        return;
      }
    }
  });

  const eligible = members
    .filter((m) => {
      const id = String(m._id);
      if (ineligible.has(id)) return false;
      if (isDeceased(m)) return false;
      const g = (m.gender || "").toLowerCase();
      return !!memberGender && !!g && memberGender !== g;
    })
    .map((m) => m._id);

  return { eligible };
};

/**
 * FIX 5 — Add Child (Existing) dropdown sanitization.
 * Returns member ids eligible to be added as child to the given marriage.
 * Excludes: spouse1, spouse2, already in childrenIds, ancestors of either spouse, descendants of either spouse.
 */
const getEligibleChildren = async ({ userId, familyId, marriageId }) => {
  const marriageCheck = await assertMarriageInFamily({ userId, familyId, marriageId });
  if (!marriageCheck.ok) return { error: { code: marriageCheck.code, errors: marriageCheck.errors } };

  const marriage = marriageCheck.marriage;
  const spouse1Id = String(marriage.spouse1Id);
  const spouse2Id = String(marriage.spouse2Id);

  const [members, marriages] = await Promise.all([
    FamilyMember.find({ userId, familyId, isDeleted: false }).lean(),
    FamilyMarriage.find({ userId, familyId, isDeleted: false }).lean(),
  ]);

  // Exclude any member that exists as child in ANY marriage (not just this marriage).
  const anyMarriageChildIds = new Set();
  for (const m of marriages) {
    getMarriageChildIds(m).forEach((id) => anyMarriageChildIds.add(id));
  }

  const { parentsOf } = buildParentAdj({ marriages });
  const ineligible = new Set([spouse1Id, spouse2Id]);
  anyMarriageChildIds.forEach((id) => ineligible.add(id));

  collectAncestors(spouse1Id, parentsOf).forEach((id) => ineligible.add(id));
  collectAncestors(spouse2Id, parentsOf).forEach((id) => ineligible.add(id));

  members.forEach((m) => {
    const mid = String(m._id);
    if (isAncestor({ parentsOf, nodeId: mid, possibleAncestorId: spouse1Id })) ineligible.add(mid);
    if (isAncestor({ parentsOf, nodeId: mid, possibleAncestorId: spouse2Id })) ineligible.add(mid);
  });

  const eligible = members
    .filter((m) => !ineligible.has(String(m._id)))
    .map((m) => m._id);

  return { eligible };
};

const createMember = async ({ userId, familyId, payload }) => {
  const data = normalizeMemberPayload(payload);
  if (!data.firstName || !data.gender) {
    return { error: { code: 400, errors: [{ msg: "firstName and gender are required" }] } };
  }
  const created = await FamilyMember.create({
    ...data,
    userId,
    familyId,
  });
  return { member: created.toObject() };
};

const updateMember = async ({ userId, familyId, memberId, payload }) => {
  const data = normalizeMemberPayload(payload);
  if (Object.keys(data).length === 0) {
    return { error: { code: 400, errors: [{ msg: "No valid fields provided" }] } };
  }
  const updated = await FamilyMember.findOneAndUpdate(
    { _id: memberId, userId, familyId, isDeleted: false },
    { $set: data },
    { returnDocument: "after" }
  ).lean();
  if (!updated) return { error: { code: 404, errors: [{ msg: "Resource not found" }] } };
  return { member: updated };
};

/**
 * FIX 6 — POLICY (EXPLICIT, DOCUMENTED):
 * - CULTURE_SPECIFIC_EXCEPTIONS = IGNORED — No allowance for cousin/in-law marriages; rules are uniformly strict.
 * - No config toggles; design intent is final to prevent accidental loosening.
 */
const createMarriage = async ({ userId, familyId, spouse1Id, spouse2Id, spouse2Payload }) => {
  if (!isValidObjectId(spouse1Id)) {
    return { error: { code: 400, errors: [{ path: "spouse1Id", msg: "Invalid resource identifier" }] } };
  }

  const spouse1Check = await assertMemberInFamily({ userId, familyId, memberId: spouse1Id });
  if (!spouse1Check.ok) return { error: { code: spouse1Check.code, errors: spouse1Check.errors } };

  let spouse2 = null;
  if (spouse2Id) {
    if (!isValidObjectId(spouse2Id)) {
      return { error: { code: 400, errors: [{ path: "spouse2Id", msg: "Invalid resource identifier" }] } };
    }
    const spouse2Check = await assertMemberInFamily({ userId, familyId, memberId: spouse2Id });
    if (!spouse2Check.ok) return { error: { code: spouse2Check.code, errors: spouse2Check.errors } };
    spouse2 = spouse2Check.member;
  } else if (spouse2Payload) {
    const data = normalizeMemberPayload(spouse2Payload);
    if (!data.firstName || !data.gender) {
      return { error: { code: 400, errors: [{ msg: "spouse2 firstName and gender are required" }] } };
    }
    const created = await FamilyMember.create({ ...data, userId, familyId });
    spouse2 = created.toObject();
    spouse2Id = spouse2._id;
  } else {
    return { error: { code: 400, errors: [{ msg: "spouse2Id or spouse2 details are required" }] } };
  }

  if (String(spouse1Id) === String(spouse2Id)) {
    return { error: { code: 400, errors: [{ msg: "Spouses must be different members" }] } };
  }

  // Enforce backend validation: same-gender marriage not allowed (use existing gender on FamilyMember).
  const spouse1 = spouse1Check.member;
  const g1 = (spouse1.gender || "").toLowerCase();
  const g2 = (spouse2.gender || "").toLowerCase();
  if (g1 && g2 && g1 === g2) {
    return { error: { code: 400, errors: [{ msg: "Same-gender marriage is not allowed" }] } };
  }

  if (spouse1.isAlive === false) {
    return { error: { code: 400, errors: [{ msg: "Deceased members cannot marry" }] } };
  }
  if (spouse2.isAlive === false) {
    return { error: { code: 400, errors: [{ msg: "Deceased members cannot marry" }] } };
  }

  // Strict marriage validation: ancestor-descendant, siblings, half-siblings, cousins, in-laws.
  const { members, marriages } = await listFamilyFlat({ userId, familyId });
  const prohibited = validateMarriageProhibited({
    members,
    marriages,
    spouse1Id,
    spouse2Id,
  });
  if (!prohibited.ok) {
    return { error: { code: 400, errors: [{ msg: "Invalid marriage: prohibited family relationship" }] } };
  }

  const a = String(spouse1Id);
  const b = String(spouse2Id);
  const spouseA = a < b ? spouse1Id : spouse2Id;
  const spouseB = a < b ? spouse2Id : spouse1Id;

  const existingActive = await FamilyMarriage.findOne({
    userId,
    familyId,
    isDeleted: false,
    status: "active",
    $or: [
      { spouse1Id: spouseA, spouse2Id: spouseB },
      { spouse1Id: spouseB, spouse2Id: spouseA },
    ],
  });
  if (existingActive) {
    return { error: { code: 400, errors: [{ msg: "Marriage already exists for these spouses" }] } };
  }

  const existingCount = await FamilyMarriage.countDocuments({
    userId,
    familyId,
    isDeleted: false,
    $or: [{ spouse1Id: spouse1Id }, { spouse2Id: spouse1Id }],
  });

  const createdMarriage = await FamilyMarriage.create({
    userId,
    familyId,
    spouse1Id: spouseA,
    spouse2Id: spouseB,
    children: [],
    order: existingCount || 0,
    status: "active",
  });

  return { marriage: createdMarriage.toObject(), spouse2 };
};

/**
 * Update marriage status (e.g. divorce / widowed). Only active marriages can be ended.
 */
const updateMarriage = async ({ userId, familyId, marriageId, status, endedAt }) => {
  const marriageCheck = await assertMarriageInFamily({ userId, familyId, marriageId });
  if (!marriageCheck.ok) return { error: { code: marriageCheck.code, errors: marriageCheck.errors } };
  const marriage = marriageCheck.marriage;

  if ((marriage.status || "active") !== "active") {
    return { error: { code: 400, errors: [{ msg: "Marriage is already ended" }] } };
  }

  const allowed = ["divorced", "widowed"];
  const newStatus = allowed.includes(status) ? status : "divorced";
  const setEndedAt = endedAt != null ? new Date(endedAt) : new Date();

  const updated = await FamilyMarriage.findByIdAndUpdate(
    marriageId,
    { $set: { status: newStatus, endedAt: setEndedAt } },
    { returnDocument: "after" }
  ).lean();

  return { marriage: updated };
};

const addChildToMarriage = async ({ userId, familyId, marriageId, childId, memberId, childPayload, order }) => {
  const marriageCheck = await assertMarriageInFamily({ userId, familyId, marriageId });
  if (!marriageCheck.ok) return { error: { code: marriageCheck.code, errors: marriageCheck.errors } };
  const marriage = marriageCheck.marriage;

  if ((marriage.status || "active") !== "active") {
    return { error: { code: 400, errors: [{ msg: "Children can only be added to an active marriage" }] } };
  }

  const spouse1Id = String(marriage.spouse1Id);
  const spouse2Id = String(marriage.spouse2Id);
  const existingChildIds = getMarriageChildIds(marriage);

  // Resolve child: payload may use memberId or childId (backward compat)
  let childMemberId = memberId || childId;
  let childMember = null;
  const creatingNewMember = !!childPayload && !childMemberId;

  if (childMemberId) {
    const childCheck = await assertMemberInFamily({ userId, familyId, memberId: childMemberId });
    if (!childCheck.ok) return { error: { code: childCheck.code, errors: childCheck.errors } };
    childMember = childCheck.member;
    childMemberId = childMember._id;
  } else if (childPayload) {
    const data = normalizeMemberPayload(childPayload);
    if (!data.firstName || !data.gender) {
      return { error: { code: 400, errors: [{ msg: "Child firstName and gender are required" }] } };
    }
  } else {
    return { error: { code: 400, errors: [{ msg: "memberId, childId or child details are required" }] } };
  }

  const cid = String(childMemberId);
  if (!creatingNewMember) {
    if (cid === spouse1Id || cid === spouse2Id) {
      return { error: { code: 400, errors: [{ msg: "Child cannot be one of the spouses of this marriage" }] } };
    }
    if (existingChildIds.has(cid)) {
      return { error: { code: 400, errors: [{ msg: "Child already exists in this marriage" }] } };
    }
    const allMarriages = await FamilyMarriage.find({ userId, familyId, isDeleted: false })
      .select("_id children")
      .lean();
    for (const m of allMarriages) {
      if (getMarriageChildIds(m).has(cid)) {
        return { error: { code: 400, errors: [{ msg: "This member already has parents and cannot be added again" }] } };
      }
    }
  }

  // Order validation: positive integer, unique among siblings
  let orderValue = order;
  if (orderValue != null) {
    if (!Number.isInteger(orderValue) || orderValue < 1) {
      return { error: { code: 400, errors: [{ path: "order", msg: "Order must be a positive integer (1, 2, 3...)" }] } };
    }
    const raw = getMarriageChildrenRaw(marriage);
    const siblingOrders = new Set(raw.map((e) => e.order).filter((o) => o != null));
    if (siblingOrders.has(orderValue)) {
      return { error: { code: 400, errors: [{ path: "order", msg: "Duplicate order among siblings; order must be unique" }] } };
    }
  } else {
    orderValue = null;
  }

  if (!creatingNewMember) {
    const cycleCheck = await validateAddChildNoCycle({
      userId,
      familyId,
      marriage,
      childId: cid,
    });
    if (!cycleCheck.ok) return { error: { code: cycleCheck.code, errors: cycleCheck.errors } };
  }

  const session = await mongoose.startSession();
  try {
    let resultMarriage = null;
    await session.withTransaction(async () => {
      if (creatingNewMember) {
        const data = normalizeMemberPayload(childPayload);
        const [created] = await FamilyMember.create(
          [{ ...data, userId, familyId }],
          { session }
        );
        childMember = created.toObject();
        childMemberId = childMember._id;
      }
      const childEntry = { memberId: childMemberId, order: orderValue };
      resultMarriage = await FamilyMarriage.findOneAndUpdate(
        { _id: marriageId, userId, familyId, isDeleted: false },
        { $push: { children: childEntry } },
        { returnDocument: "after", session }
      ).lean();
    });
    session.endSession();
    return { marriage: resultMarriage, child: childMember };
  } catch (err) {
    session.endSession();
    return { error: { code: 500, errors: [{ msg: "An error occurred" }] } };
  }
};

/**
 * PATCH child order: update manual order for a child in a marriage.
 * Payload: { order } — positive integer (unique among siblings) or null to clear.
 */
const updateChildOrder = async ({ userId, familyId, marriageId, childId, order }) => {
  const marriageCheck = await assertMarriageInFamily({ userId, familyId, marriageId });
  if (!marriageCheck.ok) return { error: { code: marriageCheck.code, errors: marriageCheck.errors } };
  const marriage = marriageCheck.marriage;

  const cid = String(childId);
  const raw = getMarriageChildrenRaw(marriage);
  const childIds = raw.map((e) => String(e.memberId));
  if (!childIds.includes(cid)) {
    return { error: { code: 404, errors: [{ msg: "Child not found in this marriage" }] } };
  }

  const orderValue = order === null || order === undefined ? null : order;
  if (orderValue !== null) {
    if (!Number.isInteger(orderValue) || orderValue < 1) {
      return { error: { code: 400, errors: [{ path: "order", msg: "Order must be a positive integer (1, 2, 3...) or empty to clear" }] } };
    }
    const siblingOrders = new Map(raw.map((e) => [String(e.memberId), e.order]));
    for (const [mid, o] of siblingOrders) {
      if (mid !== cid && o === orderValue) {
        return { error: { code: 400, errors: [{ path: "order", msg: "Duplicate order among siblings; order must be unique" }] } };
      }
    }
  }

  const children = raw.map((e) => ({
    memberId: e.memberId,
    order: String(e.memberId) === cid ? orderValue : e.order,
  }));

  const updated = await FamilyMarriage.findOneAndUpdate(
    { _id: marriageId, userId, familyId, isDeleted: false },
    { $set: { children } },
    { returnDocument: "after" }
  ).lean();

  return { marriage: updated };
};

const ensureUserFamily = async ({ userId }) => {
  const familyCheck = await assertFamilyByUser({ userId });
  if (familyCheck.ok) return { family: familyCheck.family };
  const created = await createFamilyIfMissing({ userId });
  return { family: created };
};

const ensureAccessFamilyId = async ({ userId, familyId }) => {
  const famCheck = await assertFamilyOwner({ userId, familyId });
  if (!famCheck.ok) return { error: { code: famCheck.code, errors: famCheck.errors } };
  return { family: famCheck.family };
};

/**
 * Hard delete a family member (strict mode). Step-based validation:
 * 1. Root → 400 "Root member cannot be deleted"
 * 2. Parent (spouse in marriage with children) → 400 "Delete children first"
 * 3. Else allow: ONE transaction — pull M from marriage.children, delete marriages where M is spouse, delete M.
 */
const _deleteMemberStrict = async ({ userId, familyId, memberId }) => {
  const memberCheck = await assertMemberInFamily({ userId, familyId, memberId });
  if (!memberCheck.ok) return { error: { code: memberCheck.code, errors: memberCheck.errors } };

  const mid = memberId;
  const family = await Family.findOne({ _id: familyId, userId, isDeleted: false }).lean();
  if (!family) return { error: { code: 404, errors: [{ msg: "Resource not found" }] } };

  if (family.rootMemberId && String(family.rootMemberId) === String(mid)) {
    return { error: { code: 400, errors: [{ msg: "Root member cannot be deleted" }] } };
  }

  const asSpouseMarriages = await FamilyMarriage.find(
    { userId, familyId, isDeleted: false, $or: [{ spouse1Id: mid }, { spouse2Id: mid }] },
    { children: 1 }
  ).lean();

  const hasChildren = asSpouseMarriages.some((m) => getMarriageChildIds(m).size > 0);
  if (hasChildren) {
    return { error: { code: 400, errors: [{ msg: "Delete children first" }] } };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await FamilyMarriage.updateMany(
        { userId, familyId, isDeleted: false, "children.memberId": mid },
        { $pull: { children: { memberId: mid } } },
        { session }
      );

      // Step 2: Delete all marriages where spouse1Id == M OR spouse2Id == M.
      await FamilyMarriage.deleteMany(
        {
          userId,
          familyId,
          isDeleted: false,
          $or: [{ spouse1Id: mid }, { spouse2Id: mid }],
        },
        { session }
      );

      // Step 3: Hard delete member M.
      await FamilyMember.deleteOne({ _id: mid, userId, familyId }, { session });
    });
    session.endSession();
    return { deleted: true };
  } catch (err) {
    session.endSession();
    return { error: { code: 500, errors: [{ msg: "An error occurred" }] } };
  }
};

/**
 * Calculate what will be deleted if member is deleted (preview for confirmation modal).
 * Returns counts without actually deleting.
 * DIRECTIONAL DELETE: Only deletes downward (descendants), never spouses or parents.
 */
const getMemberDeletionPreview = async ({ userId, familyId, memberId }) => {
  const memberCheck = await assertMemberInFamily({ userId, familyId, memberId });
  if (!memberCheck.ok) return { error: { code: memberCheck.code, errors: memberCheck.errors } };

  const family = await Family.findOne({ _id: familyId, userId, isDeleted: false }).lean();
  if (!family) return { error: { code: 404, errors: [{ msg: "Resource not found" }] } };

  // Load all members and marriages for tree traversal
  const [allMembers, allMarriages] = await Promise.all([
    FamilyMember.find({ userId, familyId, isDeleted: false }).lean(),
    FamilyMarriage.find({ userId, familyId, isDeleted: false }).lean(),
  ]);

  const memberById = new Map(allMembers.map((m) => [String(m._id), m]));
  const marriagesBySpouse = new Map(); // memberId -> [marriage]

  // Build index: marriages by spouse
  for (const mar of allMarriages) {
    const s1 = String(mar.spouse1Id);
    const s2 = String(mar.spouse2Id);
    if (!marriagesBySpouse.has(s1)) marriagesBySpouse.set(s1, []);
    if (!marriagesBySpouse.has(s2)) marriagesBySpouse.set(s2, []);
    marriagesBySpouse.get(s1).push(mar);
    marriagesBySpouse.get(s2).push(mar);
  }

  // DIRECTIONAL BFS: Traverse ONLY downward through children, NEVER through spouses
  const memberIdsToDelete = new Set([String(memberId)]);
  const marriageIdsToDelete = new Set();
  const queue = [String(memberId)];

  while (queue.length > 0) {
    const currentMemberId = queue.shift();

    // Find all marriages where this member is a spouse
    const memberMarriages = marriagesBySpouse.get(currentMemberId) || [];
    for (const mar of memberMarriages) {
      const marId = String(mar._id);
      if (marriageIdsToDelete.has(marId)) continue;
      
      // Mark this marriage for deletion (member participated in it)
      marriageIdsToDelete.add(marId);

      // CRITICAL: DO NOT traverse spouse links - spouses are NOT descendants
      // DO NOT add the other spouse to deletion set
      // The other spouse will remain alive, just without this marriage

      // Traverse ONLY downward: add children to queue
      for (const childIdStr of getMarriageChildIds(mar)) {
        if (!memberIdsToDelete.has(childIdStr)) {
          memberIdsToDelete.add(childIdStr);
          queue.push(childIdStr);
        }
      }
    }
  }

  const member = memberById.get(String(memberId));
  const memberName = member
    ? `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unnamed"
    : "Unknown";

  const isRootMember = family.rootMemberId && String(family.rootMemberId) === String(memberId);

  return {
    memberId: String(memberId),
    memberName,
    membersCount: memberIdsToDelete.size,
    marriagesCount: marriageIdsToDelete.size,
    isRootMember,
    willDeleteFamily: isRootMember,
  };
};

/**
 * Delete member with directional subtree deletion (only descendants; spouses remain).
 */
const _deleteMemberSubtree = async ({ userId, familyId, memberId }) => {
  const memberCheck = await assertMemberInFamily({ userId, familyId, memberId });
  if (!memberCheck.ok) return { error: { code: memberCheck.code, errors: memberCheck.errors } };

  const family = await Family.findOne({ _id: familyId, userId, isDeleted: false }).lean();
  if (!family) return { error: { code: 404, errors: [{ msg: "Resource not found" }] } };

  // Load all members and marriages for tree traversal
  const [allMembers, allMarriages] = await Promise.all([
    FamilyMember.find({ userId, familyId, isDeleted: false }).lean(),
    FamilyMarriage.find({ userId, familyId, isDeleted: false }).lean(),
  ]);

  const memberById = new Map(allMembers.map((m) => [String(m._id), m]));
  const marriagesBySpouse = new Map(); // memberId -> [marriage]

  // Build index: marriages by spouse
  for (const mar of allMarriages) {
    const s1 = String(mar.spouse1Id);
    const s2 = String(mar.spouse2Id);
    if (!marriagesBySpouse.has(s1)) marriagesBySpouse.set(s1, []);
    if (!marriagesBySpouse.has(s2)) marriagesBySpouse.set(s2, []);
    marriagesBySpouse.get(s1).push(mar);
    marriagesBySpouse.get(s2).push(mar);
  }

  // DIRECTIONAL BFS: Traverse ONLY downward through children, NEVER through spouses
  const memberIdsToDelete = new Set([String(memberId)]);
  const marriageIdsToDelete = new Set();
  const queue = [String(memberId)];

  while (queue.length > 0) {
    const currentMemberId = queue.shift();

    // Find all marriages where this member is a spouse
    const memberMarriages = marriagesBySpouse.get(currentMemberId) || [];
    for (const mar of memberMarriages) {
      const marId = String(mar._id);
      if (marriageIdsToDelete.has(marId)) continue;
      
      // Mark this marriage for deletion (member participated in it)
      marriageIdsToDelete.add(marId);

      // CRITICAL: DO NOT traverse spouse links - spouses are NOT descendants
      // DO NOT add the other spouse to deletion set
      // The other spouse will remain alive, just without this marriage

      // Traverse ONLY downward: add children to queue
      for (const childIdStr of getMarriageChildIds(mar)) {
        if (!memberIdsToDelete.has(childIdStr)) {
          memberIdsToDelete.add(childIdStr);
          queue.push(childIdStr);
        }
      }
    }
  }

  // Convert Sets to Arrays for MongoDB queries
  const memberIdsArray = Array.from(memberIdsToDelete).map((id) => new mongoose.Types.ObjectId(id));

  const isRootMember = family.rootMemberId && String(family.rootMemberId) === String(memberId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await FamilyMarriage.updateMany(
        { userId, familyId, isDeleted: false },
        { $pull: { children: { memberId: { $in: memberIdsArray } } } },
        { session }
      );

      // Step 2: Delete all marriages where spouse1Id or spouse2Id is in the deleted set (remove marriage docs).
      await FamilyMarriage.deleteMany(
        {
          userId,
          familyId,
          $or: [
            { spouse1Id: { $in: memberIdsArray } },
            { spouse2Id: { $in: memberIdsArray } },
          ],
        },
        { session }
      );

      // Step 3: Hard delete all members (target + descendants).
      await FamilyMember.deleteMany(
        { userId, familyId, _id: { $in: memberIdsArray } },
        { session }
      );

      // Step 4: If root was deleted, remove the family document.
      if (isRootMember) {
        await Family.deleteOne({ _id: familyId, userId }, { session });
      }
    });
    session.endSession();
    return {
      deleted: true,
      membersDeleted: memberIdsArray.length,
      marriagesDeleted: marriageIdsToDelete.size,
      familyDeleted: isRootMember,
    };
  } catch (err) {
    session.endSession();
    console.error("_deleteMemberSubtree error:", err);
    return { error: { code: 500, errors: [{ msg: "An error occurred" }] } };
  }
};

/**
 * Single public delete API. Default = subtree (same as current user flow).
 * mode: 'subtree' | 'strict' — strict only if explicitly requested.
 * If root is deleted (subtree) → family document is deleted. No root recovery.
 */
const deleteMember = async ({ userId, familyId, memberId, mode = "subtree" }) => {
  if (mode === "strict") {
    return _deleteMemberStrict({ userId, familyId, memberId });
  }
  return _deleteMemberSubtree({ userId, familyId, memberId });
};

module.exports = {
  ensureUserFamily,
  initFamilyWithRootCouple,
  ensureAccessFamilyId,
  listFamilyFlat,
  createMember,
  updateMember,
  createMarriage,
  updateMarriage,
  addChildToMarriage,
  updateChildOrder,
  deleteMember,
  getMemberDeletionPreview,
  getEligibleSpouses,
  getEligibleChildren,
};

