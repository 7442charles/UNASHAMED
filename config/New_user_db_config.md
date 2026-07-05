-- Create the database
CREATE DATABASE unashamed_db;

-- Create the user
CREATE USER 'unashamed_user'@'localhost' IDENTIFIED BY 'your_strong_password';

-- Grant the user full access to the database
GRANT ALL PRIVILEGES ON unashamed_db.* TO 'unashamed_user'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;

-- Exit the MySQL prompt
EXIT;