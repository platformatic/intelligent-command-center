#!/bin/sh

UI_DIR=$APP_HOME/services/frontend/dist

# Replace env vars in JavaScript files
echo "Replacing env constants"
for file in $UI_DIR/assets/*.js $UI_DIR/index.html;
do
  echo "Processing $file ...";

  sed -i 's|VITE_API_BASE_URL_VALUE|'${VITE_API_BASE_URL}'|g' $file
  sed -i 's|VITE_SERVER_URL_VALUE|'${VITE_SERVER_URL}'|g' $file
  sed -i 's|VITE_TERMS_VERSION_VALUE|'${VITE_TERMS_VERSION}'|g' $file
  sed -i 's|VITE_DEMO_LOGIN_VALUE|'${VITE_DEMO_LOGIN}'|g' $file

done

pnpm start
