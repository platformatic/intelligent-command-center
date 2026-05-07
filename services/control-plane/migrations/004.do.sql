-- Provider-agnostic rename of identity columns in control-plane.
--
-- `instances.pod_id` is the unique replica identifier (pod in K8s, task in
-- ECS). `version_registry.k8s_deployment_name` is the controller name
-- (Deployment in K8s, Service in ECS). Renaming the columns surfaces
-- machineId/controllerName at the auto-generated REST API and entity layer.

ALTER TABLE instances RENAME COLUMN pod_id TO machine_id;
ALTER TABLE version_registry RENAME COLUMN k8s_deployment_name TO controller_name;
