CREATE DATABASE appointment_system;

USE appointment_system;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher') NOT NULL
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    teacher_id INT,
    date DATE,
    time TIME,
    description TEXT,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Insert some teachers
INSERT INTO users (username, password, email, role) VALUES ('teacher1', 'hashed_password', 'teacher1@example.com', 'teacher');
INSERT INTO users (username, password, email, role) VALUES ('teacher2', 'hashed_password', 'teacher2@example.com', 'teacher');
