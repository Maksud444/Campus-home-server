/**
 * Property Listing Ranking Pipeline
 *
 * Score = 0.35 * priceScore
 *       + 0.25 * freshBoost
 *       + 0.20 * popularityScore
 *       + 0.10 * activityScore
 *       + 0.10 * recencyScore
 *
 * Final score is multiplied by stalePenalty (0.5 if >= 60 days old)
 * and locationBoost (1.3 for featured, 1.1 for verified).
 *
 * Pagination is applied AFTER sorting so ranking is always consistent.
 *
 * @param {object} matchFilter - MongoDB filter for the $match stage
 * @param {object} options
 * @param {number} options.skip  - documents to skip (for pagination)
 * @param {number} options.limit - documents to return
 * @returns {Array} MongoDB aggregation pipeline stages
 */
export function buildRankingPipeline(matchFilter = {}, { skip = 0, limit = 50 } = {}) {
  return [
    // ── 1. Filter ──────────────────────────────────────────────────────────
    { $match: matchFilter },

    // ── 2. Lookup area average price from same collection ──────────────────
    {
      $lookup: {
        from: 'properties',
        let: { propArea: '$location.area' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$location.area', '$$propArea'] },
                  { $eq: ['$isDeleted', false] },
                  { $eq: ['$status', 'active'] },
                  { $gt: ['$price', 0] },
                ],
              },
            },
          },
          { $group: { _id: null, avgPrice: { $avg: '$price' } } },
        ],
        as: '_areaStats',
      },
    },

    // ── 3. Intermediate values ──────────────────────────────────────────────
    {
      $addFields: {
        _areaAvgPrice: {
          $ifNull: [{ $arrayElemAt: ['$_areaStats.avgPrice', 0] }, 0],
        },
        // Age in days using server-side $$NOW (no JS Date injection)
        _daysOld: {
          $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, 86400000],
        },
      },
    },

    // ── 4. Score components ────────────────────────────────────────────────
    {
      $addFields: {
        // priceScore: how good the price is relative to area average.
        // Price below average → score > 1 (up to cap 2.0).
        // No price data → cold-start neutral 0.5.
        _priceScore: {
          $cond: {
            if: { $and: [{ $gt: ['$price', 0] }, { $gt: ['$_areaAvgPrice', 0] }] },
            then: { $min: [{ $divide: ['$_areaAvgPrice', '$price'] }, 2.0] },
            else: 0.5,
          },
        },

        // freshBoost: decays from 1 toward 0 as listing ages.
        _freshBoost: {
          $divide: [1.0, { $add: ['$_daysOld', 1] }],
        },

        // popularityScore: normalized views, capped at 1.0 (100 views = max).
        _popularityScore: {
          $min: [{ $divide: [{ $ifNull: ['$views', 0] }, 100.0] }, 1.0],
        },

        // activityScore: views weighted by recency (proxy for recent activity).
        _activityScore: {
          $min: [
            {
              $multiply: [
                { $divide: [{ $ifNull: ['$views', 0] }, 50.0] },
                { $divide: [1.0, { $add: ['$_daysOld', 1] }] },
              ],
            },
            1.0,
          ],
        },

        // recencyScore: pure age decay.
        _recencyScore: {
          $divide: [1.0, { $add: ['$_daysOld', 1] }],
        },

        // stalePenalty: halve score for listings older than 60 days.
        _stalePenalty: {
          $cond: {
            if: { $gte: ['$_daysOld', 60] },
            then: 0.5,
            else: 1.0,
          },
        },

        // locationBoost: featured > verified > normal.
        _locationBoost: {
          $switch: {
            branches: [
              { case: { $eq: ['$featured', true] }, then: 1.3 },
              { case: { $eq: ['$verified', true] }, then: 1.1 },
            ],
            default: 1.0,
          },
        },
      },
    },

    // ── 5. Final rank score ────────────────────────────────────────────────
    {
      $addFields: {
        _rankScore: {
          $multiply: [
            {
              $add: [
                { $multiply: [0.35, '$_priceScore'] },
                { $multiply: [0.25, '$_freshBoost'] },
                { $multiply: [0.20, '$_popularityScore'] },
                { $multiply: [0.10, '$_activityScore'] },
                { $multiply: [0.10, '$_recencyScore'] },
              ],
            },
            '$_stalePenalty',
            '$_locationBoost',
          ],
        },
      },
    },

    // ── 6. Sort by rank (highest first), tie-break by newest ───────────────
    { $sort: { _rankScore: -1, createdAt: -1 } },

    // ── 7. Pagination AFTER ranking ────────────────────────────────────────
    { $skip: skip },
    { $limit: limit },

    // ── 8. Populate userId ─────────────────────────────────────────────────
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
        as: '_userArr',
      },
    },
    {
      $addFields: {
        userId: {
          $cond: {
            if: { $gt: [{ $size: '$_userArr' }, 0] },
            then: { $arrayElemAt: ['$_userArr', 0] },
            else: '$userId',
          },
        },
      },
    },

    // ── 9. Remove all temporary fields ────────────────────────────────────
    {
      $project: {
        _areaStats: 0,
        _areaAvgPrice: 0,
        _daysOld: 0,
        _priceScore: 0,
        _freshBoost: 0,
        _popularityScore: 0,
        _activityScore: 0,
        _recencyScore: 0,
        _stalePenalty: 0,
        _locationBoost: 0,
        _rankScore: 0,
        _userArr: 0,
      },
    },
  ]
}
