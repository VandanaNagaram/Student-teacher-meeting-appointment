const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '25324',
    database: 'appointment_system'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to database');
});

app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; img-src 'self' data:; connect-src 'self' chrome-extension:;"
    );
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', 
        [username, hashedPassword, email, role], (err, result) => {
            if (err) throw err;
            res.redirect('/');
        });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) throw err;

        if (results.length > 0 && await bcrypt.compare(password, results[0].password)) {
            req.session.loggedin = true;
            req.session.user = results[0];
            res.redirect('/dashboard');
        } else {
            res.send('Incorrect Username and/or Password!');
        }
    });
});

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(__dirname + `/views/dashboard.html`);
    } else {
        res.send('Please login to view this page!');
    }
});

app.get('/schedule', (req, res) => {
    if (req.session.loggedin && req.session.user.role === 'student') {
        db.query('SELECT * FROM users WHERE role = "teacher"', (err, results) => {
            if (err) throw err;
            res.sendFile(__dirname + '/views/schedule.html');
        });
    } else if (req.session.loggedin && req.session.user.role === 'admin') {
        db.query('SELECT * FROM users WHERE role = "teacher"', (err, results) => {
            if (err) throw err;
            res.sendFile(__dirname + '/views/schedule.html');
        });
    } else {
        res.send('Access Denied!');
    }
});

app.post('/schedule', (req, res) => {
    const { teacher_id, date, time, description } = req.body;
    const student_id = req.session.user.id;

    db.query('INSERT INTO appointments (student_id, teacher_id, date, time, description) VALUES (?, ?, ?, ?, ?)', 
        [student_id, teacher_id, date, time, description], (err, result) => {
            if (err) throw err;
            res.redirect('/appointments');
        });
});

app.get('/appointments', (req, res) => {
    if (req.session.loggedin) {
        let query;
        let params;

        if (req.session.user.role === 'student') {
            // Student sees only their own appointments with status
            query = `
                SELECT appointments.date, appointments.time, appointments.description, users.username AS teacher_name, appointments.status
                FROM appointments 
                JOIN users ON appointments.teacher_id = users.id 
                WHERE appointments.student_id = ?`;
            params = [req.session.user.id];
        } else if (req.session.user.role === 'teacher') {
            // Teacher sees all appointments made by students
            query = `
                SELECT appointments.date, appointments.time, appointments.description, student.username AS student_name, appointments.id
                FROM appointments 
                JOIN users AS student ON appointments.student_id = student.id`;
            params = []; // No parameters needed
        }else if (req.session.user.role === 'admin') {
            // Teacher sees all appointments made by students
            query = `
                SELECT appointments.date, appointments.time, appointments.description, student.username AS student_name, appointments.id
                FROM appointments 
                JOIN users AS student ON appointments.student_id = student.id`;
            params = []; // No parameters needed
        } else {
            return res.send('Access Denied!');
        }

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.send('Error retrieving appointments.');
            }

            if (req.session.user.role === 'student') {
                return res.render('student-appointments', { appointments: results });
            } else if (req.session.user.role === 'teacher') {
                return res.render('teacher-appointments', { appointments: results });
            }else if (req.session.user.role === 'admin') {
                return res.render('admin', { appointments: results });
            }
        });
    } else {
        res.send('Please login to view this page!');
    }
});



app.get('/profile', (req, res) => {
    if (req.session.loggedin) {
        const user = req.session.user;
        res.render('profile', { user });
    } else {
        res.send('Please login to view this page!');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:3000`);
});

app.post('/approve-appointment', (req, res) => {
    const { appointment_id } = req.body;

    db.query('UPDATE appointments SET status = "approved" WHERE id = ?', [appointment_id], (err, result) => {
        if (err) throw err;
        // Redirect to appointments page after approving
        res.redirect('/appointments');
    });
});

app.post('/delete-appointment', (req, res) => {
    const { appointment_id } = req.body;

    db.query('DELETE FROM appointments WHERE id = ?', [appointment_id], (err, result) => {
        if (err) throw err;
        res.redirect('/appointments');
    });
});
