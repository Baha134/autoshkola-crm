// src/routes/payments.routes.js
const router = require('express').Router()
const auth = require('../middleware/auth')
const { getByLead, getAll, create, remove, exportCsv } = require('../controllers/payments.controller')

router.get('/',                auth, getAll)       // ← НОВЫЙ: все платежи
router.get('/export/csv',      auth, exportCsv)    // ← НОВЫЙ: экспорт CSV
router.get('/lead/:leadId',    auth, getByLead)    // платежи конкретного лида
router.post('/',               auth, create)
router.delete('/:id',          auth, remove)

module.exports = router