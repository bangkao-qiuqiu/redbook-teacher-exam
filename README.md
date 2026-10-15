# 英语红宝书教师考试网站

这是一个可以直接上传 GitHub Pages 的手机端考试网站。

## 已完成的功能

- 内置《英语红宝书》实际收录的Q1-Q116题库。
- 老师打开页面后只需输入姓名。
- 每天自动从116题中抽取20题，每题5分，满分100分。
- 80分及以上合格，低于80分不合格。
- 使用“老师姓名＋当天日期”生成试卷：不同老师试卷不同，同一老师当天试卷保持一致，第二天自动更新。
- 交卷后自动判分并显示错题解析。
- 老师前台以“每日测试”为主，学习区分为“完整学习”和“116个提问”两个入口。
- “完整学习”可在线逐页阅读或下载完整《英语启蒙红宝书》PDF；“116个提问”可按顺序查看、搜索全部问答内容。
- 老师前台不显示后台入口；管理员使用单独的 `admin.html` 地址登录。
- 成绩管理页仅允许唯一管理员读取，支持按姓名、日期和结果筛选，并可导出CSV。
- 未配置云端时成绩保存在当前设备；配置Supabase后可跨设备汇总全部老师成绩。

## 本地查看

不能直接双击HTML文件测试，请在本文件夹启动一个静态网页服务，然后访问首页。

## 上传 GitHub 并生成网址

1. 在 GitHub 新建仓库，推荐命名：`redbook-teacher-exam`。
2. 把本文件夹里的全部内容上传到仓库根目录，并确认默认分支名是 `main`。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中把 Source 选为 **GitHub Actions**。
5. 上传完成后等待约1–3分钟，在仓库 Actions 页面看到绿色成功标记。
6. GitHub 会给出类似 `https://你的用户名.github.io/redbook-teacher-exam/` 的网址。

## 开启所有老师成绩汇总

### 第一步：建立成绩库

1. 注册并新建一个 Supabase 项目。
2. 打开 Supabase 的 SQL Editor。
3. 复制 `supabase_setup.sql` 的全部内容并运行。

### 第二步：建立管理员账号

1. 在 Supabase 的 **Authentication → Users** 中创建一个管理员邮箱和密码。
2. 打开 `set_admin_account.sql`，把占位邮箱改成刚创建的管理员邮箱。
3. 在 Supabase 的 SQL Editor 中运行修改后的 `set_admin_account.sql`。

数据库只保留一个管理员；再次绑定新邮箱会替换旧管理员。不要把管理员密码写入网页代码或上传到 GitHub。

### 第三步：连接网站

在 Supabase 项目设置中复制 Project URL 和 anon public key，填入 `config.js`：

```js
window.APP_CONFIG = {
  supabaseUrl: "你的 Project URL",
  supabaseAnonKey: "你的 anon public key"
};
```

不要把 `service_role` key 填入网站。

## 自定义域名

GitHub免费网址不需要额外配置。若要使用自己的域名，例如 `kaoshi.example.com`：

1. 先购买或准备一个域名。
2. 在 GitHub 仓库的 **Settings → Pages → Custom domain** 中填写域名。
3. 在域名服务商后台按 GitHub 显示的要求添加DNS记录。
4. DNS生效后开启 **Enforce HTTPS**。

必须先知道实际域名和域名服务商，才能填写最终DNS记录；不要提前创建虚假的 `CNAME` 文件。

## 主要文件

- `index.html`：老师考试页面。
- `book.html`：老师学习资料和完整PDF阅读页面。
- `questions.html`：116个互动提问专项学习页面。
- `admin.html`：成绩管理页面。
- `resources/英语红宝书.pdf`：前台使用的完整红宝书文件。
- `resources/pages/`：用于手机端稳定阅读的86页清晰图片。
- `assets/questions.js`：116题题库。
- `assets/app.js`：每日抽题、答题和判分逻辑。
- `assets/storage.js`：本机及云端成绩存储。
- `supabase_setup.sql`：云端成绩库初始化脚本。
- `set_admin_account.sql`：绑定唯一管理员账号的脚本。
- `.github/workflows/pages.yml`：上传后自动发布网站。
