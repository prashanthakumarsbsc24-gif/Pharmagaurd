const { REGIONS, DEFAULT_REGION } = require('../config/regions');
const { ROLES } = require('../config/roles');

exports.options = (req, res) => {
  res.json({ regions: REGIONS, defaultRegion: DEFAULT_REGION, roles: ROLES });
};
