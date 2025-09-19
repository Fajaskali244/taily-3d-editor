-- Returns zero rows when everything is fixed
select table_schema, table_name, security_type
from information_schema.views
where table_schema = 'public'
  and security_type = 'DEFINER';