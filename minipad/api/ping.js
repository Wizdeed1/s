// Tells the Settings page which online features are ready, and whether the passcode is right.
const { send, checkPasscode } = require('./_lib');

module.exports = function handler(req, res) {
  const gate = checkPasscode(req);
  send(res, 200, {
    ok: true,
    passcodeSet: !!process.env.APP_PASSCODE,
    passcodeOk: !gate,
    claude: !!process.env.ANTHROPIC_API_KEY,
    storage: !!process.env.BLOB_READ_WRITE_TOKEN
  });
};
