ALTER TABLE version_registry RENAME COLUMN controller_name TO k8s_deployment_name;
ALTER TABLE instances RENAME COLUMN machine_id TO pod_id;
