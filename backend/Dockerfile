FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    libgd-dev \
    libonig-dev \
    libzip-dev \
    zip \
    unzip \
    curl \
    && docker-php-ext-install gd pdo pdo_mysql mbstring zip \
    && curl -sS https://getcomposer.org/installer | php \
    && mv composer.phar /usr/local/bin/composer

WORKDIR /app
COPY . .

RUN composer install --optimize-autoloader --no-scripts --no-interaction --ignore-platform-reqs

CMD sh -c "php artisan serve --host=0.0.0.0 --port=$PORT"