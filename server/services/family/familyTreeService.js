const Family = require("../../models/Family");
const FamilyMember = require("../../models/FamilyMember");
const FamilyMarriage = require("../../models/FamilyMarriage");
const { getSortedChildren } = require("../../utils/getSortedChildren");

/** Defensive limits to prevent runaway memory/CPU with very large or corrupted trees. */
const MAX_TREE_NODES = 2000;
const MAX_TREE_DEPTH = 50;

const toDisplayName = (m) => {
  const first = (m.firstName || "").trim();
  const last = (m.lastName || "").trim();
  return [first, last].filter(Boolean).join(" ").trim() || "Unnamed";
};

/**
 * Build a hierarchical tree from flat members + marriages.
 * Output shape is optimized for rendering a spouse-aware family tree:
 * node = { member, marriages: [{ marriageId, spouse, children: [node] }] }
 * Applies MAX_TREE_NODES and MAX_TREE_DEPTH; returns warning if truncated.
 */
const buildFamilyTree = async ({ userId, familyId }) => {
  const family = await Family.findOne({ _id: familyId, userId, isDeleted: false }).lean();
  if (!family) return { family: null, tree: null, members: [], marriages: [] };

  const [members, marriages] = await Promise.all([
    FamilyMember.find({ userId, familyId, isDeleted: false }).lean(),
    FamilyMarriage.find({ userId, familyId, isDeleted: false }).lean(),
  ]);

  const memberById = new Map(members.map((m) => [String(m._id), m]));

  const marriagesBySpouse = new Map(); // memberId -> [marriage]

  for (const mar of marriages) {
    const s1 = String(mar.spouse1Id);
    const s2 = String(mar.spouse2Id);
    if (!marriagesBySpouse.has(s1)) marriagesBySpouse.set(s1, []);
    if (!marriagesBySpouse.has(s2)) marriagesBySpouse.set(s2, []);
    marriagesBySpouse.get(s1).push(mar);
    marriagesBySpouse.get(s2).push(mar);
  }

  // STRICT: Tree MUST NEVER auto-guess root. Use only family.rootMemberId.
  const rootIdStr = family.rootMemberId ? String(family.rootMemberId) : null;
  // No root set yet: valid empty state — return success with tree: null (no error alert).
  if (!rootIdStr) {
    return { family, tree: null, members, marriages };
  }
  // Root set but member missing: corrupted data — return error.
  if (!memberById.has(rootIdStr)) {
    return {
      error: { code: 404, errors: [{ msg: "Family root is missing or corrupted" }] },
      family,
      tree: null,
      members,
      marriages,
    };
  }
  const rootMemberId = rootIdStr;

  const buildNode = (() => {
    const cache = new Map(); // memberId -> node
    const inStack = new Set(); // for cycle defense
    let nodeCount = 0;
    let truncated = false;

    const _build = (memberId, depth = 0) => {
      const mid = String(memberId);
      if (cache.has(mid)) return cache.get(mid);
      const member = memberById.get(mid);
      if (!member) return null;

      if (inStack.has(mid)) {
        return {
          member: { ...member, displayName: toDisplayName(member) },
          marriages: [],
          cycleDetected: true,
        };
      }

      if (depth > MAX_TREE_DEPTH) {
        truncated = true;
        return {
          member: { ...member, displayName: toDisplayName(member) },
          marriages: [],
          truncatedByDepth: true,
        };
      }

      if (nodeCount >= MAX_TREE_NODES) {
        truncated = true;
        return {
          member: { ...member, displayName: toDisplayName(member) },
          marriages: [],
          truncatedByNodes: true,
        };
      }

      nodeCount += 1;
      inStack.add(mid);

      const node = {
        member: { ...member, displayName: toDisplayName(member) },
        marriages: [],
      };
      cache.set(mid, node);

      const myMarriages = (marriagesBySpouse.get(mid) || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a._id).localeCompare(String(b._id)));

      for (const mar of myMarriages) {
        const spouseId = String(mar.spouse1Id) === mid ? String(mar.spouse2Id) : String(mar.spouse1Id);
        const spouse = memberById.get(spouseId) || null;

        const sortedChildEntries = getSortedChildren(mar, memberById);
        const children = [];
        for (const entry of sortedChildEntries) {
          if (nodeCount >= MAX_TREE_NODES) {
            truncated = true;
            break;
          }
          const childNode = _build(entry.memberId, depth + 1);
          if (childNode) children.push(childNode);
        }

        node.marriages.push({
          marriageId: String(mar._id),
          spouse: spouse ? { ...spouse, displayName: toDisplayName(spouse) } : null,
          children,
        });
      }

      inStack.delete(mid);
      return node;
    };

    const build = (rootId) => {
      const tree = _build(rootId);
      return { tree, truncated };
    };
    return build;
  })();

  const { tree, truncated } = buildNode(rootMemberId);
  const result = { family, tree, members, marriages };
  if (truncated) {
    result.warning = "Tree was truncated due to size or depth limits. Consider filtering or splitting the family.";
  }
  return result;
};

module.exports = {
  buildFamilyTree,
};

