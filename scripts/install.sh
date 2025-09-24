#!/usr/bin/env bash

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Set Internal Field Separator to handle whitespace properly
IFS=$'\n\t'

# Script directory and name
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"

# Global variables for database addresses
POSTGRES_ADDRESS="${POSTGRES_ADDRESS:-}"
VALKEY_ICC_ADDRESS="${VALKEY_ICC_ADDRESS:-}"
VALKEY_APPS_ADDRESS="${VALKEY_APPS_ADDRESS:-}"
KUBE_CONTEXT="${KUBE_CONTEXT:-}"
PUBLIC_URL="${PUBLIC_URL:-}"
PROMETHEUS_URL="${PROMETHEUS_URL:-}"

# Test mode to bypass external dependencies
TEST_MODE="${TEST_MODE:-}"

# Elasticache settings
ELASTICACHE_ROLE_ARN="${ELASTICACHE_ROLE_ARN:-}"
ELASTICACHE_REGION="${ELASTICACHE_REGION:-}"
ELASTICACHE_CLUSTER_NAME="${ELASTICACHE_CLUSTER_NAME:-}"

# OAuth settings
GITHUB_OAUTH_CLIENT_ID="${GITHUB_OAUTH_CLIENT_ID:-}"
GITHUB_OAUTH_CLIENT_SECRET="${GITHUB_OAUTH_CLIENT_SECRET:-}"
GOOGLE_OAUTH_CLIENT_ID="${GOOGLE_OAUTH_CLIENT_ID:-}"
GOOGLE_OAUTH_CLIENT_SECRET="${GOOGLE_OAUTH_CLIENT_SECRET:-}"
VALID_EMAILS="${VALID_EMAILS:-}"

# Required software
readonly REQUIRED_TOOLS=("kubectl" "helm" "psql" "jq" "openssl")

# Show usage information
show_usage() {
	cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

Install ICC (Intelligent Command Center) with required database configurations.

OPTIONS:
    --pg-superuser ADDRESS          PostgreSQL database address (optional)
    --valkey-icc ADDRESS            Valkey/Redis address for ICC internal use (optional)
    --valkey-apps ADDRESS           Valkey/Redis address for applications (optional)
    --public-url URL                Public URL for ICC access (optional)
    --prometheus URL                Prometheus server URL (optional)
    --kube-context CONTEXT          Kubernetes context name (optional)

    ELASTICACHE CONFIGURATION:
    --elasticache-role-arn ARN      Elasticache IAM role ARN (optional)
    --elasticache-region REGION     Elasticache cluster region (optional)
    --elasticache-cluster-name NAME Elasticache cluster name (optional)
    
    OAUTH AUTHENTICATION:
    --gh-oauth-client-id ID         GitHub OAuth client ID (optional)
    --github-oauth-client-id ID     GitHub OAuth client ID (alternative syntax)
    --gh-oauth-client-secret SECRET GitHub OAuth client secret (optional)
    --github-oauth-client-secret SECRET GitHub OAuth client secret (alternative syntax)
    --google-oauth-client-id ID     Google OAuth client ID (optional)
    --google-oauth-client-secret SECRET Google OAuth client secret (optional)
    --valid-emails EMAILS           Comma-separated list of valid email addresses (optional)

    -h, --help                      Show this help message

If not provided, you will be prompted to enter required values.

OAuth Configuration:
- If OAuth credentials are provided, the respective authentication method will be enabled
- If partial OAuth credentials are provided (only ID or secret), you'll be prompted for the missing part
- If no OAuth credentials are provided, you will be prompted to configure at least one authentication method

EXAMPLES:
    Interactive mode:
    ./$SCRIPT_NAME

    Non-interactive mode with GitHub OAuth:
    ./$SCRIPT_NAME \\
        --pg-superuser "postgresql://user:pass@host:5432" \\
        --valkey-icc "redis://localhost:6379" \\
        --valkey-apps "redis://localhost:6380" \\
        --public-url "https://icc.example.com" \\
        --prometheus "http://prometheus:9090" \\
        --kube-context "my-cluster" \\
        --gh-oauth-client-id "your_github_client_id" \\
        --gh-oauth-client-secret "your_github_client_secret"

    Non-interactive mode with both OAuth providers:
    ./$SCRIPT_NAME \\
        --pg-superuser "postgresql://user:pass@host:5432" \\
        --valkey-icc "redis://localhost:6379" \\
        --valkey-apps "redis://localhost:6380" \\
        --public-url "https://icc.example.com" \\
        --prometheus "http://prometheus:9090" \\
        --kube-context "my-cluster" \\
        --github-oauth-client-id "your_github_client_id" \\
        --github-oauth-client-secret "your_github_client_secret" \\
        --google-oauth-client-id "your_google_client_id" \\
        --google-oauth-client-secret "your_google_client_secret"

    With Elasticache configuration:
    ./$SCRIPT_NAME \\
        --pg-superuser "postgresql://user:pass@host:5432" \\
        --valkey-icc "redis://localhost:6379" \\
        --valkey-apps "redis://localhost:6380" \\
        --public-url "https://icc.example.com" \\
        --prometheus "http://prometheus:9090" \\
        --kube-context "my-cluster" \\
        --elasticache-role-arn "arn:aws:iam::123456789012:role/ElasticacheRole" \\
        --elasticache-region "us-west-2" \\
        --elasticache-cluster-name "my-elasticache-cluster" \\

EOF
}

# Logging functions
log() {
	local level="$1"
	shift
	echo "[$level] $*" >&2
}

info() {
	log "INFO" "$@"
}

error() {
	log "ERROR" "$@"
}

fatal() {
	error "$@"
	exit 1
}

# Parse command line arguments
parse_arguments() {
	while [[ $# -gt 0 ]]; do
		case $1 in
		--pg-superuser)
			POSTGRES_ADDRESS="$2"
			shift 2
			;;
		--valkey-icc)
			VALKEY_ICC_ADDRESS="$2"
			shift 2
			;;
		--valkey-apps)
			VALKEY_APPS_ADDRESS="$2"
			shift 2
			;;
		--kube-context)
			KUBE_CONTEXT="$2"
			shift 2
			;;
		--public-url)
			PUBLIC_URL="$2"
			shift 2
			;;
		--prometheus)
			PROMETHEUS_URL="$2"
			shift 2
			;;
		--gh-oauth-client-id | --github-oauth-client-id)
			GITHUB_OAUTH_CLIENT_ID="$2"
			shift 2
			;;
		--gh-oauth-client-secret | --github-oauth-client-secret)
			GITHUB_OAUTH_CLIENT_SECRET="$2"
			shift 2
			;;
		--google-oauth-client-id)
			GOOGLE_OAUTH_CLIENT_ID="$2"
			shift 2
			;;
		--google-oauth-client-secret)
			GOOGLE_OAUTH_CLIENT_SECRET="$2"
			shift 2
			;;
		--elasticache-role-arn)
			ELASTICACHE_ROLE_ARN="$2"
			shift 2
			;;
		--elasticache-region)
			ELASTICACHE_REGION="$2"
			shift 2
			;;
		--elasticache-cluster-name)
			ELASTICACHE_CLUSTER_NAME="$2"
			shift 2
			;;
		--valid-emails)
			VALID_EMAILS="$2"
			shift 2
			;;
		-h | --help)
			show_usage
			exit 0
			;;
		*)
			error "Unknown option: $1"
			show_usage >&2
			exit 1
			;;
		esac
	done
}

# Validate database address format
validate_postgres_address() {
	local address="$1"
	if [[ ! "$address" =~ ^postgresql:// ]]; then
		error "PostgreSQL address must start with 'postgresql://'"
		return 1
	fi
	return 0
}

# Validate Redis/Valkey address format
validate_valkey_address() {
	local address="$1"
	if [[ ! "$address" =~ ^rediss?:// ]]; then
		error "Valkey/Redis address must start with 'redis://' or 'rediss://'"
		return 1
	fi
	return 0
}

# Validate Prometheus URL format
validate_prometheus_url() {
	local url="$1"
	if [[ ! "$url" =~ ^https?:// ]]; then
		error "Prometheus URL must start with 'http://' or 'https://'"
		return 1
	fi
	return 0
}

# Validate public URL format
validate_public_url() {
	local url="$1"
	if [[ ! "$url" =~ ^https?:// ]]; then
		error "URL must start with http:// or https://. Please enter a valid URL."
		return 1
	fi
	if [[ "$url" =~ [[:space:]] ]]; then
		error "URL cannot contain spaces. Please enter a valid URL."
		return 1
	fi
	return 0
}

# Validate OAuth client ID format
validate_oauth_client_id() {
	local client_id="$1"
	if [[ -z "$client_id" ]]; then
		error "OAuth client ID cannot be empty."
		return 1
	fi
	if [[ ${#client_id} -lt 10 ]]; then
		error "OAuth client ID appears too short (minimum 10 characters)."
		return 1
	fi
	return 0
}

# Validate OAuth client secret format
validate_oauth_client_secret() {
	local client_secret="$1"
	if [[ -z "$client_secret" ]]; then
		error "OAuth client secret cannot be empty."
		return 1
	fi
	if [[ ${#client_secret} -lt 10 ]]; then
		error "OAuth client secret appears too short (minimum 10 characters)."
		return 1
	fi
	return 0
}

# Validate Elasticache role ARN format
validate_elasticache_role_arn() {
	local role_arn="$1"
	if [[ ! "$role_arn" =~ ^arn:aws:iam::[0-9]+:role/.+ ]]; then
		error "Invalid IAM role ARN format. Expected: arn:aws:iam::ACCOUNT:role/ROLE_NAME"
		return 1
	fi
	return 0
}

# Validate AWS region format
validate_aws_region() {
	local region="$1"
	if [[ ! "$region" =~ ^[a-z]{2}-[a-z]+-[0-9]+$ ]]; then
		error "Invalid AWS region format. Expected format: us-west-2, eu-central-1, etc."
		return 1
	fi
	return 0
}

# Validate Elasticache cluster name format
validate_elasticache_cluster_name() {
	local cluster_name="$1"
	if [[ ! "$cluster_name" =~ ^[a-zA-Z][a-zA-Z0-9-]*$ ]]; then
		error "Invalid cluster name. Must start with a letter and contain only letters, numbers, and hyphens."
		return 1
	fi
	if [[ ${#cluster_name} -gt 50 ]]; then
		error "Cluster name too long (maximum 50 characters)."
		return 1
	fi
	return 0
}

# Get available kubectl contexts
get_kubectl_contexts() {
	if [[ -n "$TEST_MODE" ]]; then
		printf '%s\n' "test-context-1" "test-context-2" "test-context-3"
		return 0
	fi

	local contexts
	if ! contexts=$(kubectl config view -o json 2>/dev/null | jq -r '.contexts[].name' 2>/dev/null); then
		error "Failed to get kubectl contexts"
		return 1
	fi

	if [[ -z "$contexts" ]]; then
		error "No kubectl contexts found"
		return 1
	fi

	printf '%s\n' "$contexts"
}

# Get current kubectl context
get_current_kubectl_context() {
	if [[ -n "$TEST_MODE" ]]; then
		echo "test-context-1"
		return 0
	fi
	kubectl config current-context 2>/dev/null || return 1
}

# Detect cloud provider from kubectl context
detect_cloud_provider() {
	local context_name="$1"

	if [[ -z "$context_name" ]]; then
		error "No context name provided for cloud provider detection"
		return 1
	fi

	# Get cluster information for the context
	local cluster_info
	if ! cluster_info=$(kubectl config view -o json 2>/dev/null | jq -r --arg ctx "$context_name" '.contexts[] | select(.name == $ctx) | .context.cluster'); then
		error "Failed to get cluster information for context: $context_name"
		return 1
	fi

	if [[ -z "$cluster_info" ]]; then
		error "No cluster found for context: $context_name"
		return 1
	fi

	# Get the server URL for the cluster
	local server_url
	if ! server_url=$(kubectl config view -o json 2>/dev/null | jq -r --arg cluster "$cluster_info" '.clusters[] | select(.name == $cluster) | .cluster.server'); then
		error "Failed to get server URL for cluster: $cluster_info"
		return 1
	fi

	# Cloud provider detection patterns
	local aws_patterns=("arn:aws:eks" "\.eks\.amazonaws\.com")
	local gcp_patterns=("gke_" "\.googleapis\.com" "container\.googleapis\.com" "^gcp" "_gcp_" "/zones/" "/locations/")
	local dev_patterns=("^https?://localhost" "^https?://127\.0\.0\.1" "^https?://0\.0\.0\.0"
		"^https?://.*\.local" "docker-desktop" "kind-" "k3s" "minikube" "microk8s"
		"rancher-desktop" "^https?://[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"
		"^https?://.*\.internal" "^https?://.*\.cluster\.local")

	# Check AWS patterns
	for pattern in "${aws_patterns[@]}"; do
		if [[ "$cluster_info" =~ $pattern ]] || [[ "$server_url" =~ $pattern ]]; then
			echo "aws"
			return 0
		fi
	done

	# Check GCP patterns
	for pattern in "${gcp_patterns[@]}"; do
		if [[ "$cluster_info" =~ $pattern ]] || [[ "$server_url" =~ $pattern ]]; then
			echo "gcp"
			return 0
		fi
	done

	# Check dev/local patterns
	for pattern in "${dev_patterns[@]}"; do
		if [[ "$cluster_info" =~ $pattern ]] || [[ "$server_url" =~ $pattern ]]; then
			echo "dev"
			return 0
		fi
	done

	echo ""
	return 0
}

# Generic interactive input prompt with validation
prompt_input() {
	local var_name="$1"
	local description="$2"
	local prompt_text="$3"
	local validator_func="$4"
	local is_secret="${5:-false}"
	local extra_info="${6:-}"

	info "$description"
	[[ -n "$extra_info" ]] && info "$extra_info"
	echo

	while true; do
		printf "$prompt_text"
		if [[ "$is_secret" == "true" ]]; then
			read -rs user_input
			echo # Add newline after hidden input
		else
			read -r user_input
		fi

		# Trim whitespace
		user_input=$(echo "$user_input" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

		if [[ -z "$user_input" ]]; then
			error "${var_name} cannot be empty. Please enter a valid value."
			continue
		fi

		# Validate format using provided validator function
		if [[ -n "$validator_func" ]] && ! "$validator_func" "$user_input"; then
			continue
		fi

		# Set the variable using indirect assignment
		declare -g "$var_name"="$user_input"
		if [[ "$is_secret" == "true" ]]; then
			info "${var_name} accepted"
		else
			info "Using ${var_name}: $user_input"
		fi
		return 0
	done
}

# Convenience wrappers for each input type
prompt_postgres_address() {
	prompt_input "POSTGRES_ADDRESS" \
		"ICC requires a PostgreSQL database connection" \
		"Enter the PostgreSQL address (e.g., postgresql://user:password@host:port): " \
		"validate_postgres_address"
}

prompt_valkey_icc_address() {
	prompt_input "VALKEY_ICC_ADDRESS" \
		"ICC requires a Valkey/Redis connection for internal use" \
		"Enter the Valkey/Redis address for ICC (e.g., redis://host:port or rediss://host:port): " \
		"validate_valkey_address"
}

prompt_valkey_apps_address() {
	prompt_input "VALKEY_APPS_ADDRESS" \
		"ICC requires a Valkey/Redis connection for application caching" \
		"Enter the Valkey/Redis address for applications (e.g., redis://host:port or rediss://host:port): " \
		"validate_valkey_address"
}

prompt_prometheus_url() {
	prompt_input "PROMETHEUS_URL" \
		"ICC requires a Prometheus server for metrics collection" \
		"Enter the Prometheus server URL (e.g., http://prometheus.example.com:9090): " \
		"validate_prometheus_url"
}

prompt_public_url() {
	prompt_input "PUBLIC_URL" \
		"ICC requires a public URL for external access" \
		"Enter the public URL for ICC (e.g., https://icc.example.com): " \
		"validate_public_url"
}

# OAuth configuration prompts
prompt_github_oauth_client_id() {
	prompt_input "GITHUB_OAUTH_CLIENT_ID" \
		"GitHub OAuth requires a client ID from your GitHub OAuth application" \
		"Enter your GitHub OAuth client ID: " \
		"validate_oauth_client_id" \
		"false" \
		"You can get this from GitHub Settings > Developer settings > OAuth Apps"
}

prompt_github_oauth_client_secret() {
	prompt_input "GITHUB_OAUTH_CLIENT_SECRET" \
		"GitHub OAuth requires a client secret from your GitHub OAuth application" \
		"Enter your GitHub OAuth client secret: " \
		"validate_oauth_client_secret" \
		"true" \
		"You can get this from GitHub Settings > Developer settings > OAuth Apps"
}

prompt_google_oauth_client_id() {
	prompt_input "GOOGLE_OAUTH_CLIENT_ID" \
		"Google OAuth requires a client ID from your Google Cloud Console project" \
		"Enter your Google OAuth client ID: " \
		"validate_oauth_client_id" \
		"false" \
		"You can get this from Google Cloud Console > APIs & Services > Credentials"
}

prompt_google_oauth_client_secret() {
	prompt_input "GOOGLE_OAUTH_CLIENT_SECRET" \
		"Google OAuth requires a client secret from your Google Cloud Console project" \
		"Enter your Google OAuth client secret: " \
		"validate_oauth_client_secret" \
		"true" \
		"You can get this from Google Cloud Console > APIs & Services > Credentials"
}

# Valid emails configuration prompt
prompt_valid_emails() {
	prompt_input "VALID_EMAILS" \
		"ICC requires a list of valid email addresses for user access" \
		"Enter comma-separated email addresses (e.g., user1@example.com,user2@example.com): " \
		"" \
		"false" \
		"These email addresses will be allowed to access the ICC application"
}

# Elasticache configuration prompts
prompt_elasticache_role_arn() {
	prompt_input "ELASTICACHE_ROLE_ARN" \
		"Elasticache requires an IAM role ARN for AWS access" \
		"Enter the Elasticache IAM role ARN: " \
		"validate_elasticache_role_arn" \
		"false" \
		"Example: arn:aws:iam::123456789012:role/ElasticacheRole"
}

prompt_elasticache_region() {
	prompt_input "ELASTICACHE_REGION" \
		"Elasticache requires the AWS region where the cluster is located" \
		"Enter the AWS region: " \
		"validate_aws_region" \
		"false" \
		"Example: us-west-2, eu-central-1, ap-southeast-1"
}

prompt_elasticache_cluster_name() {
	prompt_input "ELASTICACHE_CLUSTER_NAME" \
		"Elasticache requires the cluster name for connection" \
		"Enter the Elasticache cluster name: " \
		"validate_elasticache_cluster_name" \
		"false" \
		"This is the name of your existing Elasticache cluster"
}

prompt_elasticache_setup() {
	info "If the Valkey instance for Apps is hosted with AWS Elasticache, Platformatic will need an IAM role to manage the cluster."
	info "See documentation at https://icc.platformatic.dev/installation/elasticache/"
	echo

	while true; do
		printf "Do you want to configure Elasticache? [y/N]: "
		read -r response

		case "$response" in
		[yY][eE][sS] | [yY])
			info "Configuring Elasticache..."
			prompt_elasticache_role_arn
			prompt_elasticache_region
			prompt_elasticache_cluster_name
			return 0
			;;
		[nN][oO] | [nN] | "")
			info "Skipping Elasticache configuration"
			return 0
			;;
		*)
			error "Please answer yes (y) or no (n)."
			;;
		esac
	done
}

# Prompt user to choose and configure OAuth method
prompt_oauth_setup() {
	info "ICC requires at least one authentication method to be configured."
	info "Available options:"
	info "  1) GitHub OAuth"
	info "  2) Google OAuth"
	info "  3) Both GitHub and Google OAuth"
	echo

	while true; do
		printf "Select authentication method [1-3]: "
		read -r selection

		case "$selection" in
		1)
			info "Configuring GitHub OAuth..."
			prompt_github_oauth_client_id
			prompt_github_oauth_client_secret
			return 0
			;;
		2)
			info "Configuring Google OAuth..."
			prompt_google_oauth_client_id
			prompt_google_oauth_client_secret
			return 0
			;;
		3)
			info "Configuring both GitHub and Google OAuth..."
			prompt_github_oauth_client_id
			prompt_github_oauth_client_secret
			prompt_google_oauth_client_id
			prompt_google_oauth_client_secret
			return 0
			;;
		*)
			error "Invalid selection. Please enter 1, 2, or 3."
			;;
		esac
	done
}

# Interactive kubectl context selector
select_kubectl_context() {
	local contexts=()
	while IFS= read -r line; do
		[[ -n "$line" ]] && contexts+=("$line")
	done < <(get_kubectl_contexts)

	if [[ ${#contexts[@]} -eq 0 ]]; then
		error "No kubectl contexts available"
		return 1
	fi

	local current_context
	current_context=$(get_current_kubectl_context)

	info "Available kubectl contexts:"
	echo

	local i
	for i in "${!contexts[@]}"; do
		local marker=""
		if [[ "${contexts[$i]}" == "$current_context" ]]; then
			marker=" (current)"
		fi
		printf "  %d) %s%s\n" $((i + 1)) "${contexts[$i]}" "$marker"
	done

	echo
	while true; do
		printf "Select a context [1-%d]: " "${#contexts[@]}"
		read -r selection

		if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le "${#contexts[@]}" ]]; then
			KUBE_CONTEXT="${contexts[$((selection - 1))]}"
			info "Selected context: $KUBE_CONTEXT"
			return 0
		else
			error "Invalid selection. Please enter a number between 1 and ${#contexts[@]}"
		fi
	done
}

# Generate random password for database user
generate_db_password() {
	# Generate 24 random bytes and encode as base64, then replace problematic characters
	openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
}

# Generate SQL from embedded template using database services
generate_database_sql() {
	local username="$1"
	local password="$2"
	local original_postgres_url="$3"

	# Get database services
	# Keeping trafficante to align with existing installations
	local db_services=(
		"activities"
		"cluster_manager"
		"compliance"
		"control_plane"
		"cron"
		"risk_cold_storage"
		"scaler"
		"trafficante"
		"user_manager"
	)

	if [[ ${#db_services[@]} -eq 0 ]]; then
		error "No database services found"
		return 1
	fi

	# Generate database creation statements
	local database_statements=""
	local grant_statements=""
	local permission_statements=""

	for service in "${db_services[@]}"; do
		local db_name="${service//-/_}" # Replace hyphens with underscores for valid DB names

		# Database creation (PostgreSQL compatible)
		database_statements+="CREATE DATABASE ${db_name};"$'\n'

		# Grant privileges
		grant_statements+="GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${username};"$'\n'
		grant_statements+="ALTER DATABASE ${db_name} OWNER TO ${username};"$'\n'

		# Permission statements for schema-level permissions - connect to each database directly
		permission_statements+="\\c ${db_name}"$'\n'
		permission_statements+="GRANT ALL ON SCHEMA public TO ${username};"$'\n'
		permission_statements+="GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${username};"$'\n'
		permission_statements+="GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${username};"$'\n'
		permission_statements+="GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${username};"$'\n'
		permission_statements+="ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${username};"$'\n'
		permission_statements+="ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${username};"$'\n'
		permission_statements+="ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${username};"$'\n'
		permission_statements+=""$'\n'
	done

	# Embedded SQL template - replace placeholders directly
	local sql_content
	sql_content=$(
		cat <<EOF
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create databases
${database_statements}

-- Create single user for all databases
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '${username}') THEN
    CREATE USER ${username} WITH PASSWORD '${password}';
  ELSE
    ALTER USER ${username} WITH PASSWORD '${password}';
  END IF;
END \$\$;

-- Grant privileges on all databases to the single user
${grant_statements}

-- Configure database permissions for each database
${permission_statements}

-- Output credentials for confirmation
SELECT '${username}' as username, '${password}' as password;
EOF
	)

	printf '%s\n' "$sql_content"
}

# Extract credentials from PostgreSQL URL
extract_postgres_credentials() {
	local postgres_url="$1"

	if [[ -z "$postgres_url" ]]; then
		error "No PostgreSQL URL provided for credential extraction"
		return 1
	fi

	# Parse the URL to extract username and password
	# Format: postgresql://user:password@host:port or postgresql://user:password@host:port/database
	if [[ "$postgres_url" =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)(/.*)?$ ]]; then
		local username="${BASH_REMATCH[1]}"
		local password="${BASH_REMATCH[2]}"
		local host="${BASH_REMATCH[3]}"
		local port="${BASH_REMATCH[4]}"
		local database_suffix="${BASH_REMATCH[5]:-}"
	else
		error "Invalid PostgreSQL URL format for credential extraction: $postgres_url"
		return 1
	fi

	# Return values separated by pipes to handle spaces in passwords
	printf '%s|%s|%s|%s|%s' "$username" "$password" "$host" "$port" "$database_suffix"
}

# Build new PostgreSQL connection string with new credentials
build_new_connection_string() {
	local original_url="$1"
	local new_username="$2"
	local new_password="$3"

	if [[ -z "$original_url" || -z "$new_username" || -z "$new_password" ]]; then
		error "Missing parameters for connection string generation"
		return 1
	fi

	# Parse the original URL to extract components
	# Format: postgresql://user:password@host:port or postgresql://user:password@host:port/database
	if [[ "$original_url" =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)(/.*)?$ ]]; then
		local host="${BASH_REMATCH[3]}"
		local port="${BASH_REMATCH[4]}"
		local database_suffix="${BASH_REMATCH[5]:-}"
	else
		error "Invalid PostgreSQL URL format: $original_url"
		return 1
	fi

	# URL encode the password to handle special characters
	local encoded_password
	encoded_password=$(printf '%s' "$new_password" | sed 's/+/%2B/g; s!/!%2F!g; s/@/%40/g; s/:/%3A/g; s/?/%3F/g; s/#/%23/g')

	# Build new connection string
	local new_url="postgresql://${new_username}:${encoded_password}@${host}:${port}"

	printf '%s' "$new_url"
}

# Execute SQL script using PostgreSQL connection
execute_sql() {
	local sql_content="$1"
	local postgres_url="$2"

	if [[ -z "$sql_content" ]]; then
		error "No SQL content provided"
		return 1
	fi

	if [[ -z "$postgres_url" ]]; then
		error "No PostgreSQL URL provided"
		return 1
	fi

	info "Executing database setup SQL..."

	# Execute SQL using psql with better error handling
	local temp_sql_file
	temp_sql_file=$(mktemp)
	echo "$sql_content" >"$temp_sql_file"

	# Execute SQL and capture output
	local psql_output
	if psql_output=$(psql "$postgres_url" -f "$temp_sql_file"); then
		info "Database setup completed successfully"
		echo "$temp_sql_file"
		#rm -f "$temp_sql_file"
		return 0
	else
		# Check if errors are only about existing objects
		if echo "$psql_output" | grep -qE "(already exists|does not exist)" &&
			! echo "$psql_output" | grep -qE "(FATAL|syntax error)" | grep -v "already exists"; then
			info "Database setup completed (some objects already existed)"
			rm -f "$temp_sql_file"
			return 0
		else
			error "Database setup failed:"
			error "$psql_output"
			rm -f "$temp_sql_file"
			return 1
		fi
	fi
}

# Generic function to validate or prompt for input
validate_or_prompt() {
	local var_name="$1"
	local prompt_func="$2"
	local validate_func="$3"
	local description="$4"

	local current_value
	eval "current_value=\$$var_name"

	if [[ -z "$current_value" ]]; then
		info "No $description specified, prompting for input..."
		if ! "$prompt_func"; then
			fatal "Failed to get $description"
		fi
	else
		if ! "$validate_func" "$current_value"; then
			fatal "Invalid $description format"
		fi
	fi
}

# Elasticache configuration logic
handle_elasticache_configuration() {
	# Check if any Elasticache parameters are already provided
	local has_partial_config=false
	local has_complete_config=false

	if [[ -n "$ELASTICACHE_ROLE_ARN" || -n "$ELASTICACHE_REGION" || -n "$ELASTICACHE_CLUSTER_NAME" ]]; then
		has_partial_config=true

		# Check if all required parameters are provided
		if [[ -n "$ELASTICACHE_ROLE_ARN" && -n "$ELASTICACHE_REGION" && -n "$ELASTICACHE_CLUSTER_NAME" ]]; then
			has_complete_config=true
		fi
	fi

	if [[ "$has_complete_config" == true ]]; then
		# Validate all provided parameters
		if ! validate_elasticache_role_arn "$ELASTICACHE_ROLE_ARN"; then
			fatal "Invalid Elasticache role ARN"
		fi
		if ! validate_aws_region "$ELASTICACHE_REGION"; then
			fatal "Invalid AWS region"
		fi
		if ! validate_elasticache_cluster_name "$ELASTICACHE_CLUSTER_NAME"; then
			fatal "Invalid Elasticache cluster name"
		fi
		info "Elasticache configuration provided and validated"
	elif [[ "$has_partial_config" == true ]]; then
		# Some parameters provided, prompt for missing ones
		info "Partial Elasticache configuration detected, prompting for missing values..."

		if [[ -z "$ELASTICACHE_ROLE_ARN" ]]; then
			prompt_elasticache_role_arn
		else
			if ! validate_elasticache_role_arn "$ELASTICACHE_ROLE_ARN"; then
				fatal "Invalid Elasticache role ARN"
			fi
		fi

		if [[ -z "$ELASTICACHE_REGION" ]]; then
			prompt_elasticache_region
		else
			if ! validate_aws_region "$ELASTICACHE_REGION"; then
				fatal "Invalid AWS region"
			fi
		fi

		if [[ -z "$ELASTICACHE_CLUSTER_NAME" ]]; then
			prompt_elasticache_cluster_name
		else
			if ! validate_elasticache_cluster_name "$ELASTICACHE_CLUSTER_NAME"; then
				fatal "Invalid Elasticache cluster name"
			fi
		fi
	else
		# No Elasticache parameters provided, ask user if they want to configure it
		prompt_elasticache_setup
	fi

	return 0
}

# OAuth configuration logic
handle_oauth_configuration() {
	local github_partial=false
	local google_partial=false
	local has_any_oauth=false

	# Check for partial GitHub OAuth configuration
	if [[ -n "$GITHUB_OAUTH_CLIENT_ID" && -z "$GITHUB_OAUTH_CLIENT_SECRET" ]]; then
		github_partial=true
		info "GitHub OAuth client ID provided, prompting for client secret..."
		prompt_github_oauth_client_secret
	elif [[ -z "$GITHUB_OAUTH_CLIENT_ID" && -n "$GITHUB_OAUTH_CLIENT_SECRET" ]]; then
		github_partial=true
		info "GitHub OAuth client secret provided, prompting for client ID..."
		prompt_github_oauth_client_id
	elif [[ -n "$GITHUB_OAUTH_CLIENT_ID" && -n "$GITHUB_OAUTH_CLIENT_SECRET" ]]; then
		# Validate provided GitHub OAuth credentials
		if ! validate_oauth_client_id "$GITHUB_OAUTH_CLIENT_ID"; then
			fatal "Invalid GitHub OAuth client ID"
		fi
		if ! validate_oauth_client_secret "$GITHUB_OAUTH_CLIENT_SECRET"; then
			fatal "Invalid GitHub OAuth client secret"
		fi
		has_any_oauth=true
		info "GitHub OAuth configuration provided"
	fi

	# Check for partial Google OAuth configuration
	if [[ -n "$GOOGLE_OAUTH_CLIENT_ID" && -z "$GOOGLE_OAUTH_CLIENT_SECRET" ]]; then
		google_partial=true
		info "Google OAuth client ID provided, prompting for client secret..."
		prompt_google_oauth_client_secret
	elif [[ -z "$GOOGLE_OAUTH_CLIENT_ID" && -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]]; then
		google_partial=true
		info "Google OAuth client ID provided, prompting for client ID..."
		prompt_google_oauth_client_id
	elif [[ -n "$GOOGLE_OAUTH_CLIENT_ID" && -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]]; then
		# Validate provided Google OAuth credentials
		if ! validate_oauth_client_id "$GOOGLE_OAUTH_CLIENT_ID"; then
			fatal "Invalid Google OAuth client ID"
		fi
		if ! validate_oauth_client_secret "$GOOGLE_OAUTH_CLIENT_SECRET"; then
			fatal "Invalid Google OAuth client secret"
		fi
		has_any_oauth=true
		info "Google OAuth configuration provided"
	fi

	# If partial configurations were completed, mark as having OAuth
	if [[ "$github_partial" == true && -n "$GITHUB_OAUTH_CLIENT_ID" && -n "$GITHUB_OAUTH_CLIENT_SECRET" ]]; then
		has_any_oauth=true
	fi
	if [[ "$google_partial" == true && -n "$GOOGLE_OAUTH_CLIENT_ID" && -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]]; then
		has_any_oauth=true
	fi

	# If no OAuth configuration provided, prompt user to set up authentication
	if [[ "$has_any_oauth" == false ]]; then
		info "No OAuth configuration provided, prompting for authentication setup..."
		prompt_oauth_setup
		has_any_oauth=true
	fi

	# Verify at least one OAuth method is configured
	if [[ -z "$GITHUB_OAUTH_CLIENT_ID" && -z "$GOOGLE_OAUTH_CLIENT_ID" ]]; then
		fatal "At least one OAuth authentication method must be configured"
	fi

	# Prompt for valid emails
	if [[ -z "$VALID_EMAILS" ]]; then
		info "No valid emails specified, prompting for input..."
		prompt_valid_emails
	else
		info "Using specified valid emails: $VALID_EMAILS"
	fi

	return 0
}

# Check if ICC is already installed via Helm
check_existing_installation() {
	info "Checking for existing ICC installation..."

	local release_name="platformatic"
	local namespace="platformatic"

	# Skip helm checks in test mode
	if [[ -n "$TEST_MODE" ]]; then
		info "Test mode: skipping existing installation check"
		return 0
	fi

	# Check if the helm release exists
	if helm status "$release_name" --kube-context "$KUBE_CONTEXT" --namespace "$namespace" >/dev/null 2>&1; then
		local status
		status=$(helm status "$release_name" --kube-context "$KUBE_CONTEXT" --namespace "$namespace" -o json | jq -r '.info.status' 2>/dev/null)

		if [[ "$status" == "deployed" ]]; then
			error "ICC is already installed and deployed in namespace '$namespace'"
			error "Release name: $release_name"
			error "To reinstall, first uninstall the existing release:"
			error "  helm uninstall $release_name --namespace $namespace"
			return 1
		elif [[ "$status" == "pending-install" || "$status" == "pending-upgrade" ]]; then
			error "ICC installation is currently in progress (status: $status)"
			error "Please wait for the current operation to complete or cancel it"
			return 1
		elif [[ "$status" == "failed" ]]; then
			error "Previous ICC installation failed (status: $status)"
			error "Please clean up the failed installation before proceeding:"
			error "  helm uninstall $release_name --namespace $namespace"
			return 1
		else
			info "Found helm release in status '$status', proceeding with installation"
		fi
	else
		info "No existing ICC installation found, proceeding with fresh installation"
	fi

	return 0
}

# Check for required software
check_requirements() {
	info "Checking for required software..."

	local missing_tools=()

	for tool in "${REQUIRED_TOOLS[@]}"; do
		if ! command -v "$tool" >/dev/null 2>&1; then
			missing_tools+=("$tool")
		fi
	done

	if [[ ${#missing_tools[@]} -gt 0 ]]; then
		error "Missing required tools: ${missing_tools[*]}"
		return 1
	fi

	info "All required tools found"
	return 0
}

# Main function
main() {
	# Parse command line arguments
	parse_arguments "$@"

	# Handle kubectl context selection
	if [[ -n "$TEST_MODE" ]]; then
		info "Test mode: using mock kubectl context"
		KUBE_CONTEXT="test-context-1"
	elif [[ -z "$KUBE_CONTEXT" ]]; then
		info "No kubectl context specified, starting interactive selection..."
		if ! select_kubectl_context; then
			fatal "Failed to select kubectl context"
		fi
	else
		info "Using specified kubectl context: $KUBE_CONTEXT"
		# Validate that the specified context exists
		local available_contexts=()
		while IFS= read -r line; do
			[[ -n "$line" ]] && available_contexts+=("$line")
		done < <(get_kubectl_contexts)
		local context_found=false
		local ctx
		for ctx in "${available_contexts[@]}"; do
			if [[ "$ctx" == "$KUBE_CONTEXT" ]]; then
				context_found=true
				break
			fi
		done

		if [[ "$context_found" != true ]]; then
			error "Specified kubectl context '$KUBE_CONTEXT' not found"
			info "Available contexts:"
			printf '  %s\n' "${available_contexts[@]}"
			fatal "Invalid kubectl context specified"
		fi
	fi

	# Validate that installation can continue
	if ! check_existing_installation; then
		fatal "Installation check failed"
	fi
	if ! check_requirements; then
		fatal "Requirements check failed"
	fi

	# Handle interactive input for missing required parameters
	validate_or_prompt "POSTGRES_ADDRESS" "prompt_postgres_address" "validate_postgres_address" "PostgreSQL address"
	validate_or_prompt "VALKEY_ICC_ADDRESS" "prompt_valkey_icc_address" "validate_valkey_address" "Valkey ICC address"
	validate_or_prompt "VALKEY_APPS_ADDRESS" "prompt_valkey_apps_address" "validate_valkey_address" "Valkey Apps address"
	validate_or_prompt "PROMETHEUS_URL" "prompt_prometheus_url" "validate_prometheus_url" "Prometheus URL"

	# Handle remaining input validation
	validate_or_prompt "PUBLIC_URL" "prompt_public_url" "validate_public_url" "public URL"

	# Handle OAuth configuration
	info "Configuring authentication methods..."
	if ! handle_oauth_configuration; then
		fatal "Failed to configure OAuth authentication"
	fi

	# Handle Elasticache configuration
	info "Checking Elasticache configuration..."
	if ! handle_elasticache_configuration; then
		fatal "Failed to configure Elasticache"
	fi

	# Detect and validate cloud provider
	info "Detecting cloud provider from kubectl context: $KUBE_CONTEXT"
	local cloud_provider
	if ! cloud_provider=$(detect_cloud_provider "$KUBE_CONTEXT"); then
		fatal "Failed to detect supported cloud provider"
	fi
	info "Detected cloud provider: $cloud_provider"

	# Change to script directory
	cd "$SCRIPT_DIR"

	info "Basic checks passed - ready for installation steps"

	# Database setup
	info "Setting up databases..."
	local db_username="platformatic_icc"
	local db_password
	db_password=$(generate_db_password)

	# Generate SQL from embedded template
	local sql_content
	if ! sql_content=$(generate_database_sql "$db_username" "$db_password" "$POSTGRES_ADDRESS"); then
		fatal "Failed to generate database SQL"
	fi

	# Execute database setup
	if ! execute_sql "$sql_content" "$POSTGRES_ADDRESS"; then
		fatal "Database setup failed"
	fi

	# Build new connection string with created credentials
	local new_postgres_url
	if ! new_postgres_url=$(build_new_connection_string "$POSTGRES_ADDRESS" "$db_username" "$db_password"); then
		fatal "Failed to build new PostgreSQL connection string"
	fi
	info "Database setup completed successfully"

	# Deploy ICC using Helm
	info "Deploying ICC with Helm..."

	# Build Elasticache configuration parameters
	local helm_elasticache_args=()
	if [[ -n "$ELASTICACHE_ROLE_ARN" ]]; then
		helm_elasticache_args+=("--set" "services.icc.elasticache.role_arn=$ELASTICACHE_ROLE_ARN")
		info "Elasticache role ARN: $ELASTICACHE_ROLE_ARN"
	fi
	if [[ -n "$ELASTICACHE_REGION" ]]; then
		helm_elasticache_args+=("--set" "services.icc.elasticache.region=$ELASTICACHE_REGION")
		info "Elasticache region: $ELASTICACHE_REGION"
	fi
	if [[ -n "$ELASTICACHE_CLUSTER_NAME" ]]; then
		helm_elasticache_args+=("--set" "services.icc.elasticache.cluster_name=$ELASTICACHE_CLUSTER_NAME")
		info "Elasticache cluster name: $ELASTICACHE_CLUSTER_NAME"
	fi

	# Build OAuth configuration parameters
	local helm_oauth_args=()

	# Configure GitHub OAuth if provided
	if [[ -n "$GITHUB_OAUTH_CLIENT_ID" && -n "$GITHUB_OAUTH_CLIENT_SECRET" ]]; then
		helm_oauth_args+=(
			"--set" "services.icc.login_methods.github.enable=true"
			"--set" "services.icc.login_methods.github.client_id=$GITHUB_OAUTH_CLIENT_ID"
			"--set" "services.icc.login_methods.github.client_secret=$GITHUB_OAUTH_CLIENT_SECRET"
			"--set" "services.icc.login_methods.github.valid_emails=$VALID_EMAILS"
		)
		info "Enabling GitHub OAuth authentication"
	else
		helm_oauth_args+=(
			"--set" "services.icc.login_methods.github.enable=false"
		)
	fi

	# Configure Google OAuth if provided
	if [[ -n "$GOOGLE_OAUTH_CLIENT_ID" && -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]]; then
		helm_oauth_args+=(
			"--set" "services.icc.login_methods.google.enable=true"
			"--set" "services.icc.login_methods.google.client_id=$GOOGLE_OAUTH_CLIENT_ID"
			"--set" "services.icc.login_methods.google.client_secret=$GOOGLE_OAUTH_CLIENT_SECRET"
			"--set" "services.icc.login_methods.google.valid_emails=$VALID_EMAILS"
		)
		info "Enabling Google OAuth authentication"
	else
		helm_oauth_args+=(
			"--set" "services.icc.login_methods.google.enable=false"
		)
	fi

	if ! helm install platformatic oci://ghcr.io/platformatic/helm \
		--version "4.0.0" \
		--create-namespace \
		--namespace platformatic \
		--set "cloud=$cloud_provider" \
		--set "services.icc.image.repository=platformatic/intelligent-command-center" \
		--set "services.icc.image.tag=latest" \
		--set "services.icc.database_url=$new_postgres_url" \
		--set "services.icc.public_url=$PUBLIC_URL" \
		--set "services.icc.prometheus.url=$PROMETHEUS_URL" \
		--set "services.icc.valkey.apps_url=$VALKEY_APPS_ADDRESS" \
		--set "services.icc.valkey.icc_url=$VALKEY_ICC_ADDRESS" \
		--set "services.icc.secrets.user_manager_session=$(openssl rand -base64 32)" \
		--set "services.icc.secrets.icc_session=$(openssl rand -hex 32)" \
		--set "services.icc.secrets.control_plane_keys=$(openssl rand -hex 32)" \
		"${helm_elasticache_args[@]}" \
		"${helm_oauth_args[@]}"; then
		fatal "Helm deployment failed"
	fi
	info "ICC installation completed successfully"
}

# Only run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	main "$@"
fi
