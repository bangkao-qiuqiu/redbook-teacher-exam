-- 先在 Supabase → Authentication → Users 中创建一个邮箱密码账号。
-- 再把下方邮箱替换成该账号的真实邮箱，并在 SQL Editor 中运行本文件。
-- 反复运行会替换旧管理员，系统始终只保留一个管理员。

insert into public.site_admin (singleton, user_id)
select true, id
from auth.users
where lower(email) = lower('请替换为管理员邮箱')
on conflict (singleton)
do update set user_id = excluded.user_id;

-- 若结果为 0 行，说明这个邮箱尚未在 Authentication 中成功创建。
select a.user_id, u.email
from public.site_admin a
join auth.users u on u.id = a.user_id;
