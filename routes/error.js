const express = require('express');
const router = express.Router();
// error
router.get('/', async (req, res) => {
  return res.render('error', {
    code: '-1'
  });
})
module.exports = router;