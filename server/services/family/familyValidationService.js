const mongoose = require("mongoose");
const Family = require("../../models/Family");
const FamilyMember = require("../../models/FamilyMember");
const FamilyMarriage = require("../../models/FamilyMarriage");
const { getMarriageChildIds } = require("../../utils/getSortedChildren");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const pickAllowed = (obj, allowedKeys) => {
  const out = {};
  (allowedKeys || []).forEach((k) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  });
  return out;
};

const normalizeMemberPayload = (payload) => {
  const allowed = [
    "firstName",
    "lastName",
    "gender",
    "dob",
    "dateOfDeath",
    "isAlive",
    "notes",
    "meta",
  ];
  const data = pickAllowed(payload || {}, allowed);

  if (typeof data.firstName === "string") data.firstName = data.firstName.trim();
  if (typeof data.lastName === "string") data.lastName = data.lastName.trim();
  if (typeof data.notes === "string") data.notes = data.notes.trim();

  if (data.dob) {
    const d = new Date(data.dob);
    if (!isNaN(d.getTime())) data.dob = d;
    else delete data.dob;
  }
  if (data.dateOfDeath) {
    const d = new Date(data.dateOfDeath);
    if (!isNaN(d.getTime())) data.dateOfDeath = d;
    else delete data.dateOfDeath;
  }

  if (Object.prototype.hasOwnProperty.call(data, "isAlive")) {
    data.isAlive = Boolean(data.isAlive);
  }

  return data;
};

const assertFamilyOwner = async ({ userId, familyId }) => {
  if (!isValidObjectId(userId) || !isValidObjectId(familyId)) {
    return { ok: false, code: 400, errors: [{ path: "id", msg: "Invalid resource identifier" }] };
  }

  const family = await Family.findOne({
    _id: familyId,
    userId,
    isDeleted: false,
  }).lean();

  if (!family) {
    return { ok: false, code: 404, errors: [{ msg: "Resource not found" }] };
  }

  return { ok: true, family };
};

const assertFamilyByUser = async ({ userId }) => {
  if (!isValidObjectId(userId)) {
    return { ok: false, code: 400, errors: [{ path: "userId", msg: "Invalid resource identifier" }] };
  }

  const family = await Family.findOne({ userId, isDeleted: false }).lean();
  if (!family) return { ok: false, code: 404, errors: [{ msg: "Resource not found" }] };
  return { ok: true, family };
};

const assertMemberInFamily = async ({ userId, familyId, memberId }) => {
  if (!isValidObjectId(memberId)) {
    return { ok: false, code: 400, errors: [{ path: "memberId", msg: "Invalid resource identifier" }] };
  }

  const member = await FamilyMember.findOne({
    _id: memberId,
    userId,
    familyId,
    isDeleted: false,
  }).lean();

  if (!member) return { ok: false, code: 404, errors: [{ msg: "Resource not found" }] };
  return { ok: true, member };
};

const assertMarriageInFamily = async ({ userId, familyId, marriageId }) => {
  if (!isValidObjectId(marriageId)) {
    return { ok: false, code: 400, errors: [{ path: "marriageId", msg: "Invalid resource identifier" }] };
  }

  const marriage = await FamilyMarriage.findOne({
    _id: marriageId,
    userId,
    familyId,
    isDeleted: false,
  }).lean();

  if (!marriage) return { ok: false, code: 404, errors: [{ msg: "Resource not found" }] };
  return { ok: true, marriage };
};

/**
 * Cycle prevention: parent–child edges from marriages.
 * Uses getMarriageChildIds(marriage) which reads from marriage.children only.
 */
const buildParentAdj = ({ marriages }) => {
  const parentsOf = new Map(); // childId -> Set(parentIds)
  for (const m of marriages || []) {
    const p1 = String(m.spouse1Id);
    const p2 = String(m.spouse2Id);
    const childIds = getMarriageChildIds(m);
    for (const cid of childIds) {
      const idStr = String(cid);
      if (!parentsOf.has(idStr)) parentsOf.set(idStr, new Set());
      parentsOf.get(idStr).add(p1);
      parentsOf.get(idStr).add(p2);
    }
  }
  return { parentsOf };
};

const isAncestor = ({ parentsOf, nodeId, possibleAncestorId }) => {
  // Walk upwards from nodeId to see if possibleAncestorId appears in ancestors
  const target = String(possibleAncestorId);
  const start = String(nodeId);
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    const parents = parentsOf.get(cur);
    if (!parents) continue;
    for (const p of parents) {
      if (p === target) return true;
      stack.push(p);
    }
  }
  return false;
};

/**
 * True if A and B share at least one parent (full or half siblings).
 */
const shareAnyParent = (a, b, { parentsOf }) => {
  const aStr = String(a);
  const bStr = String(b);
  const parentsA = parentsOf.get(aStr);
  const parentsB = parentsOf.get(bStr);
  if (!parentsA || !parentsB) return false;
  for (const p of parentsA) {
    if (parentsB.has(p)) return true;
  }
  return false;
};

/**
 * True if parents of A and parents of B are siblings (share a parent) — i.e. A and B are cousins.
 */
const areCousins = (a, b, { parentsOf }) => {
  const parentsA = parentsOf.get(String(a));
  const parentsB = parentsOf.get(String(b));
  if (!parentsA || !parentsB) return false;
  for (const pa of parentsA) {
    for (const pb of parentsB) {
      if (shareAnyParent(pa, pb, { parentsOf })) return true;
    }
  }
  return false;
};

/**
 * Collect ancestor ids up to maxDepth generations upward (excluding self).
 * Generation 1 = parents, 2 = grandparents, 3 = great-grandparents.
 */
const collectAncestorsUpToDepth = (nodeId, parentsOf, maxDepth) => {
  const out = new Set();
  const start = String(nodeId);
  let frontier = [start];
  let depth = 0;
  const seen = new Set([start]);
  while (depth < maxDepth && frontier.length > 0) {
    const next = [];
    for (const cur of frontier) {
      const parents = parentsOf.get(cur);
      if (!parents) continue;
      for (const p of parents) {
        if (seen.has(p)) continue;
        seen.add(p);
        out.add(p);
        next.push(p);
      }
    }
    frontier = next;
    depth += 1;
  }
  return out;
};

const ANCESTOR_GENERATIONS = 3;

/**
 * Ultra-strict cousin rule: marriage BLOCKED if spouses share ANY common ancestor within 3 generations.
 * (First cousins, second cousins, parallel/cross cousins — all blocked.)
 */
const hasSharedAncestorWithin3Generations = (a, b, { parentsOf }) => {
  const ancestorsA = collectAncestorsUpToDepth(a, parentsOf, ANCESTOR_GENERATIONS);
  const ancestorsB = collectAncestorsUpToDepth(b, parentsOf, ANCESTOR_GENERATIONS);
  for (const id of ancestorsA) {
    if (ancestorsB.has(id)) return true;
  }
  return false;
};

/**
 * Maximum strict in-law: marriage BLOCKED if A or B has any in-law relation with the other.
 * - Spouse of A is ancestor/descendant of B (or vice versa)
 * - Spouse of A shares any common ancestor (within 3 gen) with B (or vice versa)
 * Covers: parent's spouse, child's spouse, spouse's parent/child/sibling, sibling's spouse, etc.
 */
const isInLawConflict = (a, b, { parentsOf, spousesOf }) => {
  const aStr = String(a);
  const bStr = String(b);
  const spousesA = spousesOf.get(aStr);
  const spousesB = spousesOf.get(bStr) || new Set();
  if (spousesA) {
    for (const s of spousesA) {
      if (isAncestor({ parentsOf, nodeId: bStr, possibleAncestorId: s })) return true;
      if (isAncestor({ parentsOf, nodeId: s, possibleAncestorId: bStr })) return true;
      if (hasSharedAncestorWithin3Generations(s, bStr, { parentsOf })) return true;
    }
  }
  if (spousesB) {
    for (const s of spousesB) {
      if (isAncestor({ parentsOf, nodeId: aStr, possibleAncestorId: s })) return true;
      if (isAncestor({ parentsOf, nodeId: s, possibleAncestorId: aStr })) return true;
      if (hasSharedAncestorWithin3Generations(s, aStr, { parentsOf })) return true;
    }
  }
  return false;
};

const validateAddChildNoCycle = async ({ userId, familyId, marriage, childId }) => {
  const marriages = await FamilyMarriage.find({
    userId,
    familyId,
    isDeleted: false,
  })
    .select("spouse1Id spouse2Id children")
    .lean();

  const { parentsOf } = buildParentAdj({ marriages });

  const spouse1Id = String(marriage.spouse1Id);
  const spouse2Id = String(marriage.spouse2Id);
  const cid = String(childId);

  // Child -> ancestor of spouse: if spouse is descendant of child, adding would create a cycle.
  if (isAncestor({ parentsOf, nodeId: spouse1Id, possibleAncestorId: cid })) {
    return { ok: false, code: 400, errors: [{ msg: "Invalid relationship: cycle detected" }] };
  }
  if (isAncestor({ parentsOf, nodeId: spouse2Id, possibleAncestorId: cid })) {
    return { ok: false, code: 400, errors: [{ msg: "Invalid relationship: cycle detected" }] };
  }

  // Spouse -> ancestor of child: neither spouse must be an ancestor of the child.
  if (isAncestor({ parentsOf, nodeId: cid, possibleAncestorId: spouse1Id })) {
    return { ok: false, code: 400, errors: [{ msg: "Invalid relationship: cycle detected" }] };
  }
  if (isAncestor({ parentsOf, nodeId: cid, possibleAncestorId: spouse2Id })) {
    return { ok: false, code: 400, errors: [{ msg: "Invalid relationship: cycle detected" }] };
  }

  return { ok: true };
};

module.exports = {
  isValidObjectId,
  normalizeMemberPayload,
  assertFamilyOwner,
  assertFamilyByUser,
  assertMemberInFamily,
  assertMarriageInFamily,
  validateAddChildNoCycle,
  buildParentAdj,
  isAncestor,
  shareAnyParent,
  areCousins,
  collectAncestorsUpToDepth,
  hasSharedAncestorWithin3Generations,
  isInLawConflict,
};

