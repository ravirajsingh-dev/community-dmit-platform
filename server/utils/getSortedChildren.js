/**
 * Single source of truth for child order.
 * Used by: tree builder, flat list API, marriage detail API, admin APIs.
 *
 * Sorting priority:
 * 1) If both have DOB and DOB differs → older (earlier DOB) first
 * 2) Else if both have manual order → smaller order first
 * 3) Else if only one has manual order → child with order first
 * 4) Else → preserve insertion order (stable)
 *
 * @param {Object} marriage - Marriage doc with .children array [{ memberId, order }]
 * @param {Map<string, Object>} membersById - Map of memberId string -> member doc (with dob)
 * @returns {Array<{ memberId: string, order: number|null }>} Sorted list of child entries
 */
function getSortedChildren(marriage, membersById) {
  const raw = getMarriageChildrenRaw(marriage);
  if (!raw.length) return [];

  const list = raw.map((e) => ({
    memberId: String(e.memberId),
    order: e.order != null && Number.isInteger(e.order) ? e.order : null,
  }));

  list.sort((a, b) => {
    const memberA = membersById.get(a.memberId);
    const memberB = membersById.get(b.memberId);
    const dobA = memberA?.dob ? new Date(memberA.dob).getTime() : null;
    const dobB = memberB?.dob ? new Date(memberB.dob).getTime() : null;

    if (dobA != null && dobB != null && dobA !== dobB) {
      return dobA - dobB;
    }
    const orderA = a.order;
    const orderB = b.order;
    if (orderA != null && orderB != null) {
      return orderA - orderB;
    }
    if (orderA != null && orderB == null) return -1;
    if (orderA == null && orderB != null) return 1;
    return 0;
  });

  return list;
}

/**
 * Get raw children list from marriage. Uses ONLY .children array.
 *
 * @param {Object} marriage
 * @returns {Array<{ memberId: ObjectId|string, order: number|null }>}
 */
function getMarriageChildrenRaw(marriage) {
  if (!marriage) return [];
  const children = marriage.children;
  if (!Array.isArray(children)) return [];
  return children.map((c) => ({
    memberId: c.memberId,
    order: c.order != null && Number.isInteger(c.order) ? c.order : null,
  }));
}

/**
 * Get set of child member ids for a marriage (for validation / eligibility).
 * Uses same source as getMarriageChildrenRaw.
 */
function getMarriageChildIds(marriage) {
  const raw = getMarriageChildrenRaw(marriage);
  return new Set(raw.map((e) => String(e.memberId)));
}

module.exports = {
  getSortedChildren,
  getMarriageChildrenRaw,
  getMarriageChildIds,
};
