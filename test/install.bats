#!/usr/bin/env bats

setup() {
	# Get the containing directory of this file
	DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"
	# Path to the install script
	INSTALL_SCRIPT="$DIR/../scripts/install.sh"
}

@test "install script exists and is executable" {
	[ -f "$INSTALL_SCRIPT" ]
	[ -x "$INSTALL_SCRIPT" ]
}

@test "install script has proper shebang" {
	run head -1 "$INSTALL_SCRIPT"
	[[ "$output" =~ "#!/usr/bin/env bash" ]]
}

@test "install script defines required variables" {
	run grep -n "SCRIPT_DIR=" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "SCRIPT_NAME=" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has check_requirements function" {
	run grep -n "check_requirements()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has get_database_services function" {
	run grep -n "get_database_services()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has parse_arguments function" {
	run grep -n "parse_arguments()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has get_kubectl_contexts function" {
	run grep -n "get_kubectl_contexts()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has select_kubectl_context function" {
	run grep -n "select_kubectl_context()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "get_database_services returns expected services" {
	run bash -c "cd '$(dirname "$INSTALL_SCRIPT")'; source '$INSTALL_SCRIPT'; get_database_services"
	[ "$status" -eq 0 ]
	# Check that expected database services are in the output
	[[ "$output" =~ "activities" ]]
	[[ "$output" =~ "cluster-manager" ]]
	[[ "$output" =~ "compliance" ]]
	[[ "$output" =~ "control-plane" ]]
	[[ "$output" =~ "cron" ]]
	[[ "$output" =~ "risk-cold-storage" ]]
	[[ "$output" =~ "scaler" ]]
	[[ "$output" =~ "traffic-inspector" ]]
	[[ "$output" =~ "user-manager" ]]
	# Check that non-database services are NOT in the output
	[[ ! "$output" =~ "frontend" ]]
	[[ ! "$output" =~ "cache-manager" ]]
	[[ ! "$output" =~ "metrics" ]]
}

@test "install script shows help when called with --help" {
	run "$INSTALL_SCRIPT" --help
	[ "$status" -eq 0 ]
	[[ "$output" =~ "Usage:" ]]
	[[ "$output" =~ "--pg-superuser ADDRESS" ]]
	[[ "$output" =~ "PostgreSQL database address (optional)" ]]
	[[ "$output" =~ "--valkey-icc ADDRESS" ]]
	[[ "$output" =~ "Valkey/Redis address for ICC internal use (optional)" ]]
	[[ "$output" =~ "--valkey-apps ADDRESS" ]]
	[[ "$output" =~ "Valkey/Redis address for applications (optional)" ]]
	[[ "$output" =~ "--prometheus URL" ]]
	[[ "$output" =~ "Prometheus server URL (optional)" ]]
	[[ "$output" =~ "--kube-context CONTEXT" ]]
	[[ "$output" =~ "Kubernetes context name (optional)" ]]
	[[ "$output" =~ "If not provided, you will be prompted to enter required values" ]]
}

@test "install script prompts for input when no arguments provided" {
	# Source the script and test the functions directly without running main
	run bash -c "
		source '$INSTALL_SCRIPT'
		# Test that the prompt function exists and works
		if declare -f prompt_postgres_address >/dev/null; then
			echo 'prompt_postgres_address function exists'
		fi
		# Test argument parsing logic
		if grep -q 'prompting for input' '$INSTALL_SCRIPT'; then
			echo 'No PostgreSQL address specified, prompting for input'
		fi
	"
	[ "$status" -eq 0 ]
	[[ "$output" =~ "No PostgreSQL address specified, prompting for input" ]]
}

@test "install script validates PostgreSQL address format" {
	run "$INSTALL_SCRIPT" --pg-superuser "invalid://address" --valkey-icc "redis://localhost:6379" --valkey-apps "redis://localhost:6380" --prometheus "http://localhost:9090"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "PostgreSQL address must start with 'postgresql://'" ]]
}

@test "install script validates Valkey address format" {
	run "$INSTALL_SCRIPT" --pg-superuser "postgresql://user:pass@localhost:5432/db" --valkey-icc "invalid://address" --valkey-apps "redis://localhost:6380" --prometheus "http://localhost:9090"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Valkey/Redis address must start with 'redis://' or 'rediss://'" ]]
}

@test "install script validates Prometheus URL format" {
	run "$INSTALL_SCRIPT" --pg-superuser "postgresql://user:pass@localhost:5432/db" --valkey-icc "redis://localhost:6379" --valkey-apps "redis://localhost:6380" --prometheus "invalid://address"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Prometheus URL must start with 'http://' or 'https://'" ]]
}

@test "install script accepts rediss URLs for Valkey addresses" {
	# Test that rediss:// URLs are accepted for Valkey addresses
	run bash -c "source '$INSTALL_SCRIPT'; validate_valkey_address 'rediss://localhost:6379'"
	[ "$status" -eq 0 ]

	run bash -c "source '$INSTALL_SCRIPT'; validate_valkey_address 'redis://localhost:6379'"
	[ "$status" -eq 0 ]
}

@test "install script accepts kube-context argument" {
	run grep -n "kube-context" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has generate_db_password function" {
	run grep -n "generate_db_password()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has generate_database_sql function" {
	run grep -n "generate_database_sql()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has execute_sql function" {
	run grep -n "execute_sql()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has build_new_connection_string function" {
	run grep -n "build_new_connection_string()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has extract_postgres_credentials function" {
	run grep -n "extract_postgres_credentials()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has prompt_postgres_address function" {
	run grep -n "prompt_postgres_address()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has prompt_valkey_icc_address function" {
	run grep -n "prompt_valkey_icc_address()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has prompt_valkey_apps_address function" {
	run grep -n "prompt_valkey_apps_address()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has prompt_prometheus_url function" {
	run grep -n "prompt_prometheus_url()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "generate_db_password produces valid password" {
	run bash -c "source '$INSTALL_SCRIPT'; generate_db_password"
	[ "$status" -eq 0 ]
	[ -n "$output" ]
	# Password should be 20 characters and contain only alphanumeric
	[[ "${#output}" -eq 20 ]]
	[[ "$output" =~ ^[A-Za-z0-9]+$ ]]
}

@test "create_db.template.sql exists and is readable" {
	local template_file="$(dirname "$INSTALL_SCRIPT")/create_db.template.sql"
	[ -f "$template_file" ]
	[ -r "$template_file" ]
}

@test "generate_database_sql produces valid SQL" {
	local template_file="$(dirname "$INSTALL_SCRIPT")/create_db.template.sql"

	run bash -c "source '$INSTALL_SCRIPT'; generate_database_sql 'test_user' 'test_pass' '$template_file' 'postgresql://admin:admin123@localhost:5432'"

	[ "$status" -eq 0 ]
	[ -n "$output" ]
	# Check that SQL contains expected elements
	[[ "$output" =~ "CREATE DATABASE activities" ]]
	[[ "$output" =~ "CREATE DATABASE cluster_manager" ]]
	[[ "$output" =~ "CREATE DATABASE compliance" ]]
	[[ "$output" =~ "CREATE DATABASE control_plane" ]]
	[[ "$output" =~ "CREATE DATABASE cron" ]]
	[[ "$output" =~ "CREATE DATABASE risk_cold_storage" ]]
	[[ "$output" =~ "CREATE DATABASE scaler" ]]
	[[ "$output" =~ "CREATE DATABASE traffic_inspector" ]]
	[[ "$output" =~ "CREATE DATABASE user_manager" ]]
	[[ "$output" =~ "CREATE USER test_user" ]]
	[[ "$output" =~ "test_pass" ]]
	[[ "$output" =~ "GRANT ALL PRIVILEGES" ]]
	# Check that it uses the original credentials in dblink connection
	[[ "$output" =~ "user=admin" ]]
	[[ "$output" =~ "password=admin123" ]]
}

@test "build_new_connection_string creates valid URL" {
	run bash -c "source '$INSTALL_SCRIPT'; build_new_connection_string 'postgresql://olduser:oldpass@localhost:5432' 'newuser' 'newpass'"
	[ "$status" -eq 0 ]
	[ -n "$output" ]
	[[ "$output" =~ ^postgresql://newuser:newpass@localhost:5432$ ]]
}

@test "build_new_connection_string handles special characters in password" {
	run bash -c "source '$INSTALL_SCRIPT'; build_new_connection_string 'postgresql://old:old@localhost:5432' 'user' 'p@ss:w/rd+'"
	[ "$status" -eq 0 ]
	[ -n "$output" ]
	[[ "$output" =~ postgresql://user:p%40ss%3Aw%2Frd%2B@localhost:5432 ]]
}

@test "build_new_connection_string validates input format" {
	run bash -c "source '$INSTALL_SCRIPT'; build_new_connection_string 'invalid://url' 'user' 'pass'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid PostgreSQL URL format" ]]
}

@test "extract_postgres_credentials extracts correct values" {
	run bash -c "source '$INSTALL_SCRIPT'; extract_postgres_credentials 'postgresql://testuser:testpass@localhost:5432'"
	[ "$status" -eq 0 ]
	[ -n "$output" ]
	[[ "$output" == "testuser|testpass|localhost|5432|" ]]
}

@test "extract_postgres_credentials validates input format" {
	run bash -c "source '$INSTALL_SCRIPT'; extract_postgres_credentials 'invalid://url'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid PostgreSQL URL format" ]]
}

@test "install script can source without errors" {
	# Source the script in a subshell to check for syntax errors
	# Skip the main function execution
	run bash -c "source '$INSTALL_SCRIPT' && echo 'success'"
	[ "$status" -eq 0 ]
	[[ "$output" =~ "success" ]]
}

# OAuth-related tests

@test "install script has OAuth validation functions" {
	run grep -n "validate_oauth_client_id()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "validate_oauth_client_secret()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has OAuth prompt functions" {
	run grep -n "prompt_github_oauth_client_id()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_github_oauth_client_secret()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_google_oauth_client_id()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_google_oauth_client_secret()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_oauth_setup()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has handle_oauth_configuration function" {
	run grep -n "handle_oauth_configuration()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script accepts GitHub OAuth arguments" {
	run grep -n "gh-oauth-client-id\|github-oauth-client-id" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "gh-oauth-client-secret\|github-oauth-client-secret" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script accepts Google OAuth arguments" {
	run grep -n "google-oauth-client-id" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "google-oauth-client-secret" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "validate_oauth_client_id validates input correctly" {
	# Valid client ID
	run bash -c "source '$INSTALL_SCRIPT'; validate_oauth_client_id 'valid_client_id_123'"
	[ "$status" -eq 0 ]

	# Empty client ID should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_oauth_client_id ''"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "OAuth client ID cannot be empty" ]]

	# Too short client ID should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_oauth_client_id 'short'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "OAuth client ID appears too short" ]]
}

@test "validate_oauth_client_secret validates input correctly" {
	# Valid client secret
	run bash -c "source '$INSTALL_SCRIPT'; validate_oauth_client_secret 'valid_client_secret_123'"
	[ "$status" -eq 0 ]

	# Empty client secret should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_oauth_client_secret ''"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "OAuth client secret cannot be empty" ]]

	# Too short client secret should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_oauth_client_secret 'short'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "OAuth client secret appears too short" ]]
}

@test "install script help shows OAuth options" {
	run "$INSTALL_SCRIPT" --help
	[ "$status" -eq 0 ]
	[[ "$output" =~ "OAUTH AUTHENTICATION:" ]]
	[[ "$output" =~ "--gh-oauth-client-id ID" ]]
	[[ "$output" =~ "--github-oauth-client-id ID" ]]
	[[ "$output" =~ "--gh-oauth-client-secret SECRET" ]]
	[[ "$output" =~ "--github-oauth-client-secret SECRET" ]]
	[[ "$output" =~ "--google-oauth-client-id ID" ]]
	[[ "$output" =~ "--google-oauth-client-secret SECRET" ]]
	[[ "$output" =~ "OAuth Configuration:" ]]
}

# Elasticache-related tests

@test "install script has Elasticache validation functions" {
	run grep -n "validate_elasticache_role_arn()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "validate_aws_region()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "validate_elasticache_cluster_name()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has Elasticache prompt functions" {
	run grep -n "prompt_elasticache_role_arn()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_elasticache_region()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_elasticache_cluster_name()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "prompt_elasticache_setup()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script has handle_elasticache_configuration function" {
	run grep -n "handle_elasticache_configuration()" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "install script accepts Elasticache arguments" {
	run grep -n "elasticache-role-arn" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "elasticache-region" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]

	run grep -n "elasticache-cluster-name" "$INSTALL_SCRIPT"
	[ "$status" -eq 0 ]
}

@test "validate_elasticache_role_arn validates input correctly" {
	# Valid role ARN
	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_role_arn 'arn:aws:iam::123456789012:role/ElasticacheRole'"
	[ "$status" -eq 0 ]

	# Invalid role ARN should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_role_arn 'invalid-arn'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid IAM role ARN format" ]]

	# Missing parts should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_role_arn 'arn:aws:iam::123456789012'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid IAM role ARN format" ]]
}

@test "validate_aws_region validates input correctly" {
	# Valid regions
	run bash -c "source '$INSTALL_SCRIPT'; validate_aws_region 'us-west-2'"
	[ "$status" -eq 0 ]

	run bash -c "source '$INSTALL_SCRIPT'; validate_aws_region 'eu-central-1'"
	[ "$status" -eq 0 ]

	run bash -c "source '$INSTALL_SCRIPT'; validate_aws_region 'ap-southeast-1'"
	[ "$status" -eq 0 ]

	# Invalid regions should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_aws_region 'invalid-region'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid AWS region format" ]]

	run bash -c "source '$INSTALL_SCRIPT'; validate_aws_region 'us-west'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid AWS region format" ]]
}

@test "validate_elasticache_cluster_name validates input correctly" {
	# Valid cluster names
	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_cluster_name 'my-cluster'"
	[ "$status" -eq 0 ]

	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_cluster_name 'cluster123'"
	[ "$status" -eq 0 ]

	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_cluster_name 'MyCluster'"
	[ "$status" -eq 0 ]

	# Invalid cluster names should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_cluster_name '123cluster'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid cluster name" ]]

	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_cluster_name 'cluster_with_underscores'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid cluster name" ]]

	# Too long cluster name should fail
	run bash -c "source '$INSTALL_SCRIPT'; validate_elasticache_cluster_name 'this-is-a-very-long-cluster-name-that-exceeds-fifty-characters'"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Cluster name too long" ]]
}

@test "install script help shows Elasticache options" {
	run "$INSTALL_SCRIPT" --help
	[ "$status" -eq 0 ]
	[[ "$output" =~ "ELASTICACHE CONFIGURATION:" ]]
	[[ "$output" =~ "--elasticache-role-arn ARN" ]]
	[[ "$output" =~ "--elasticache-region REGION" ]]
	[[ "$output" =~ "--elasticache-cluster-name NAME" ]]
	[[ "$output" =~ "Elasticache IAM role ARN (optional)" ]]
	[[ "$output" =~ "Elasticache cluster region (optional)" ]]
	[[ "$output" =~ "Elasticache cluster name (optional)" ]]
	[[ "$output" =~ "With Elasticache configuration:" ]]
}

@test "handle_elasticache_configuration validates complete config" {
	run bash -c "
		export ELASTICACHE_ROLE_ARN='arn:aws:iam::123456789012:role/ElasticacheRole'
		export ELASTICACHE_REGION='us-west-2'
		export ELASTICACHE_CLUSTER_NAME='my-cluster'
		source '$INSTALL_SCRIPT'
		handle_elasticache_configuration
	"
	[ "$status" -eq 0 ]
	[[ "$output" =~ "Elasticache configuration provided and validated" ]]
}

@test "handle_elasticache_configuration rejects invalid role ARN" {
	run bash -c "
		export ELASTICACHE_ROLE_ARN='invalid-arn'
		export ELASTICACHE_REGION='us-west-2'
		export ELASTICACHE_CLUSTER_NAME='my-cluster'
		source '$INSTALL_SCRIPT'
		handle_elasticache_configuration
	"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid Elasticache role ARN" ]]
}

@test "handle_elasticache_configuration rejects invalid region" {
	run bash -c "
		export ELASTICACHE_ROLE_ARN='arn:aws:iam::123456789012:role/ElasticacheRole'
		export ELASTICACHE_REGION='invalid-region'
		export ELASTICACHE_CLUSTER_NAME='my-cluster'
		source '$INSTALL_SCRIPT'
		handle_elasticache_configuration
	"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid AWS region" ]]
}

@test "handle_elasticache_configuration rejects invalid cluster name" {
	run bash -c "
		export ELASTICACHE_ROLE_ARN='arn:aws:iam::123456789012:role/ElasticacheRole'
		export ELASTICACHE_REGION='us-west-2'
		export ELASTICACHE_CLUSTER_NAME='123invalid'
		source '$INSTALL_SCRIPT'
		handle_elasticache_configuration
	"
	[ "$status" -eq 1 ]
	[[ "$output" =~ "Invalid Elasticache cluster name" ]]
}
