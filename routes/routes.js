const express = require('express')
const router = express.Router()
const GetBarcodeController = require('../controller/GetBarcodeController')

router.route('/GetBarcode')
    .get(GetBarcodeController.GetBarcode);
router.route('/ditokocom')
    .get(GetBarcodeController.ListBarcode);
router.route('/LogsIncoming')
    .get(GetBarcodeController.LogsIncoming);
router.route('/LogsOutgoing')
    .get(GetBarcodeController.LogsOutgoing);
router.route('/viewAddSession')
    .get(GetBarcodeController.ViewAddSession);
router.route('/addSession')
    .get(GetBarcodeController.AddSession);
router.route('/DeleteBarcode')
    .get(GetBarcodeController.DeleteBarcode);
router.route('/DeleteLogs')
    .get(GetBarcodeController.DeleteLogs);
router.route('/whatsapp/public/send')
    .post(GetBarcodeController.saveDatachat);
router.route('/DeleteMessageDelay')
    .get(GetBarcodeController.deleteMessageDelay);

module.exports = router;