#!/bin/bash

npm run build 
sh dist.sh 
eb deploy api-dev