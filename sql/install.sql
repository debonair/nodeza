CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `resetPasswordToken` varchar(255) DEFAULT NULL,
  `resetPasswordExpires` datetime DEFAULT NULL,
  `gender` varchar(10) DEFAULT '',
  `last_name` varchar(255) DEFAULT '',
  `location` varchar(255) DEFAULT '',
  `website` varchar(255) DEFAULT '',
  `twitter` varchar(255) DEFAULT '',
  `github` varchar(255) DEFAULT '',
  `about` varchar(255) DEFAULT '',
  `image_url` varchar(255) DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


CREATE TABLE IF NOT EXISTS `tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned NOT NULL,
  `kind` varchar(32) NOT NULL,
  `accessToken` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO `roles` (`role`)  VALUES ('Registered'), ('Publisher'), ('Super Admin');


CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `number` varchar(10) DEFAULT NULL,
  `desc` varchar(255) NOT NULL,
  `dt` date NOT NULL,
  `start_time` time NOT NULL,
  `finish_time` time DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `city` varchar(140) DEFAULT NULL,
  `town` varchar(140) DEFAULT NULL,
  `address` text NOT NULL,
  `lng` double DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;