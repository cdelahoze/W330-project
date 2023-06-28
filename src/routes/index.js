import {Router} from 'express'

const router = Router()

router.get('/', (req, res) => res.render('index.ejs')) //
router.get('/about', (req, res) => res.render('about.ejs')) //
router.get('/contact', (req, res) => res.render('contact.ejs')) //

export default router;