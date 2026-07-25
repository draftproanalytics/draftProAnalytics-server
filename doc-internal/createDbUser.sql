# log in (if Ubuntu local):
sudo mysql -u root

-- create user for local dev (TCP)
CREATE USER 'dpaQaUser01'@'127.0.0.1' IDENTIFIED BY 'Password2@25!';
GRANT ALL PRIVILEGES ON MyNFL.* TO 'dpaQaUser01'@'127.0.0.1';

-- also allow socket/localhost path if you sometimes use 'localhost'
CREATE USER 'dpaQaUser01'@'localhost' IDENTIFIED BY 'Password2@25!';
GRANT ALL PRIVILEGES ON MyNFL.* TO 'dpaQaUser01'@'localhost';

FLUSH PRIVILEGES;
