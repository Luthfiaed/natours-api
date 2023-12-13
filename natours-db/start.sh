#!/bin/bash

sleep 10

mongoimport --drop --host mongo_db --username natours-app --password minyong123 --authenticationDatabase admin --db natours --collection reviews --type json --jsonArray --file /collections/reviews.json

mongoimport --drop --host mongo_db --username natours-app --password minyong123 --authenticationDatabase admin --db natours --collection users --type json --jsonArray --file /collections/users.json

mongoimport --drop --host mongo_db --username natours-app --password minyong123 --authenticationDatabase admin --db natours --collection tours --type json --jsonArray --file /collections/tours.json