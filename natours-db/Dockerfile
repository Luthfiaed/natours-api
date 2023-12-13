FROM mongo

COPY collections/reviews.json collections/reviews.json

COPY collections/users.json collections/users.json

COPY collections/tours.json collections/tours.json

ADD start.sh /start.sh

RUN chmod +x /start.sh

CMD ["/start.sh"]