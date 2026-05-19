#!/bin/sh

UI_DIR=$APP_HOME/services/frontend/dist

# Build all case/plural variants of the autoscaler unit label from a single
# operator-provided env var. The frontend bundle has the original placeholder
# folded by the minifier into multiple variants (lowercase singular, capitalized
# singular, uppercase plural, etc.) so we substitute each variant separately.
UNIT_RAW="${VITE_AUTOSCALER_UNIT:-pod}"
UNIT_LOWER=$(echo "$UNIT_RAW" | tr '[:upper:]' '[:lower:]')
UNIT_UPPER=$(echo "$UNIT_RAW" | tr '[:lower:]' '[:upper:]')
UNIT_CAP=$(echo "$UNIT_LOWER" | sed 's/^./\U&/')
UNITS_LOWER="${UNIT_LOWER}s"
UNITS_CAP="${UNIT_CAP}s"
UNITS_UPPER="${UNIT_UPPER}S"

# Replace env vars in JavaScript files
echo "Replacing env constants"
for file in $UI_DIR/assets/*.js $UI_DIR/index.html;
do
  echo "Processing $file ...";

  sed -i 's|VITE_API_BASE_URL_VALUE|'${VITE_API_BASE_URL}'|g' $file
  sed -i 's|VITE_SERVER_URL_VALUE|'${VITE_SERVER_URL}'|g' $file
  sed -i 's|VITE_TERMS_VERSION_VALUE|'${VITE_TERMS_VERSION}'|g' $file
  sed -i 's|VITE_DEMO_LOGIN_VALUE|'${VITE_DEMO_LOGIN}'|g' $file
  sed -i 's|VITE_SUPPORTED_LOGINS_VALUE|'${VITE_SUPPORTED_LOGINS}'|g' $file

  # Substitute longest patterns first so the singular doesn't partial-match the plural
  sed -i "s|VITE_AUTOSCALER_UNIT_VALUES|${UNITS_UPPER}|g" $file
  sed -i "s|Vite_autoscaler_unit_values|${UNITS_CAP}|g" $file
  sed -i "s|vite_autoscaler_unit_values|${UNITS_LOWER}|g" $file
  sed -i "s|VITE_AUTOSCALER_UNIT_VALUE|${UNIT_UPPER}|g" $file
  sed -i "s|Vite_autoscaler_unit_value|${UNIT_CAP}|g" $file
  sed -i "s|vite_autoscaler_unit_value|${UNIT_LOWER}|g" $file

done

pnpm start
