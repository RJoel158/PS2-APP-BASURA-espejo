import express from 'express';
import { saveAppConfig, getAppConfigByKey } from '../Controllers/appConfigController.js';

const router = express.Router();

router.post('/', saveAppConfig);
router.get('/:configKey', getAppConfigByKey);

export default router;
