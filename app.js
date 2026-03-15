const SUPABASE_URL = "https://hzsxlpzsknysjdpodpgg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xNazlHkI4DFI175UfCRt5Q_-EXtNKkL";
const POST_IMAGES_BUCKET = "post-images";
const PROFILE_IMAGES_BUCKET = "profile-images";
const APP_BASE_PATH = window.location.hostname.endsWith("github.io") ? "/Newsletter" : "";
const EMAIL_CONFIRM_REDIRECT_PATH = `${APP_BASE_PATH}/confirmado.html`;

// This email gates who can publish posts after login.
const ADMIN_EMAIL = "admin@rsp.com";

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const postsContainer = document.getElementById("postsContainer");
const emptyState = document.getElementById("emptyState");
const template = document.getElementById("postTemplate");
const authState = document.getElementById("authState");
const authSwitch = document.getElementById("authSwitch");
const showLoginFormBtn = document.getElementById("showLoginFormBtn");
const showRegisterFormBtn = document.getElementById("showRegisterFormBtn");
const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const registerPanel = document.getElementById("registerPanel");
const registerForm = document.getElementById("registerForm");
const postForm = document.getElementById("postForm");
const logoutBtn = document.getElementById("logoutBtn");
const imageInput = document.getElementById("image");
const postImagePreview = document.getElementById("postImagePreview");
const adminPublishLink = document.getElementById("adminPublishLink");
const authNavLink = document.getElementById("authNavLink");
const loginRedirectLink = document.getElementById("loginRedirectLink");
const profilePanel = document.getElementById("profilePanel");
const profileForm = document.getElementById("profileForm");
const profileNameInput = document.getElementById("profileName");
const profileAvatarInput = document.getElementById("profileAvatar");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");

const isHomePage = Boolean(postsContainer && template);
const isLoginPage = Boolean(loginForm && !postForm);
const isPublishPage = Boolean(postForm);

let currentSession = null;
let commentsAvailable = true;
let profilePreviewUrl = null;
let postPreviewUrl = null;
let authMode = "login";

const DEFAULT_AVATAR = "./pablo.jpeg";

const hasValidSupabaseUrl = () => !SUPABASE_URL.includes("YOUR-PROJECT-REF");

const getToastStack = () => {
  let stack = document.getElementById("toastStack");

  if (stack) {
    return stack;
  }

  stack = document.createElement("div");
  stack.id = "toastStack";
  stack.className = "toast-stack";
  document.body.appendChild(stack);
  return stack;
};

const showToast = (message, variant = "info") => {
  const stack = getToastStack();
  const toast = document.createElement("div");
  toast.className = `toast-item ${variant}`;
  toast.textContent = message;
  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 220);
  }, 3200);
};

const formatDate = (isoDate) => {
  return new Date(isoDate).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getDayKey = (isoDate) => {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDayHeader = (dayKey) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
};

const normalizeFileName = (fileName) => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
};

const getProfileName = (user) => {
  const meta = user?.user_metadata || {};
  const maybeName = meta.display_name || meta.full_name || meta.name;

  if (typeof maybeName === "string" && maybeName.trim()) {
    return maybeName.trim();
  }

  const email = user?.email || "";
  return email.includes("@") ? email.split("@")[0] : "Usuario";
};

const getProfileAvatar = (user) => {
  const avatar = user?.user_metadata?.avatar_url;
  return typeof avatar === "string" && avatar.trim() ? avatar : DEFAULT_AVATAR;
};

const uploadProfileImage = async (file, userId) => {
  const fileName = normalizeFileName(file.name || "avatar.jpg");
  const filePath = `${userId}/avatar-${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

const isAdminUser = (user) => {
  const email = user?.email || "";
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

const setAdminNavVisibility = (session) => {
  if (!adminPublishLink) {
    return;
  }

  const showAdminLink = Boolean(session?.user && isAdminUser(session.user));
  adminPublishLink.classList.toggle("hidden", !showAdminLink);
};

const setAuthNavLabel = (session) => {
  if (!authNavLink) {
    return;
  }

  authNavLink.textContent = session ? "Perfil" : "Iniciar sesión";
};

const setAuthMode = (mode) => {
  authMode = mode === "register" ? "register" : "login";

  if (!loginPanel || !registerPanel || !showLoginFormBtn || !showRegisterFormBtn) {
    return;
  }

  const showLogin = authMode === "login";

  loginPanel.classList.toggle("is-collapsed", !showLogin);
  registerPanel.classList.toggle("is-collapsed", showLogin);
  showLoginFormBtn.classList.toggle("active", showLogin);
  showRegisterFormBtn.classList.toggle("active", !showLogin);
  showLoginFormBtn.setAttribute("aria-selected", String(showLogin));
  showRegisterFormBtn.setAttribute("aria-selected", String(!showLogin));
};

const uploadPostImage = async (file, userId) => {
  const fileName = normalizeFileName(file.name || "photo.jpg");
  const filePath = `${userId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

const renderComments = (post, commentItems, container) => {
  container.innerHTML = "";

  if (!commentsAvailable) {
    const warning = document.createElement("p");
    warning.className = "comment-empty";
    warning.textContent = "Los comentarios no estan disponibles: crea la tabla 'comments' en Supabase.";
    container.appendChild(warning);
    return;
  }

  if (!commentItems.length) {
    const emptyComment = document.createElement("p");
    emptyComment.className = "comment-empty";
    emptyComment.textContent = "Todavia no hay comentarios en esta noticia.";
    container.appendChild(emptyComment);
    return;
  }

  for (const comment of commentItems) {
    const article = document.createElement("article");
    article.className = "comment-item";

    const header = document.createElement("div");
    header.className = "comment-header";

    const avatar = document.createElement("img");
    avatar.className = "comment-avatar";
    avatar.alt = `Avatar de ${comment.author_name || "usuario"}`;
    avatar.src = comment.author_avatar_url || DEFAULT_AVATAR;

    const meta = document.createElement("p");
    meta.className = "comment-meta";
    meta.textContent = `${comment.author_name} - ${formatDate(comment.created_at)}`;

    const body = document.createElement("p");
    body.className = "comment-body";
    body.textContent = comment.content;

    header.appendChild(avatar);
    header.appendChild(meta);
    article.appendChild(header);
    article.appendChild(body);
    container.appendChild(article);
  }
};

const handleCommentSubmit = async (event, postId) => {
  event.preventDefault();

  if (!hasValidSupabaseUrl()) {
    showToast("Falta configurar SUPABASE_URL en app.js con la URL real de tu proyecto.", "error");
    return;
  }

  if (!commentsAvailable) {
    showToast("La tabla 'comments' no existe en Supabase.", "error");
    return;
  }

  if (!currentSession?.user) {
    showToast("Debes iniciar sesion para comentar.", "info");
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 450);
    return;
  }

  const form = event.currentTarget;
  const contentInput = form.querySelector(".comment-content");
  const status = form.querySelector(".comment-status");
  const authorName = getProfileName(currentSession.user);
  const authorAvatarUrl = getProfileAvatar(currentSession.user);
  const content = contentInput.value.trim();

  if (!content) {
    status.textContent = "Escribe un comentario.";
    return;
  }

  let { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_name: authorName,
    author_user_id: currentSession.user.id,
    author_avatar_url: authorAvatarUrl,
    content
  });

  if (error && error.code === "PGRST204") {
    ({ error } = await supabase.from("comments").insert({
      post_id: postId,
      author_name: authorName,
      content
    }));
  }

  if (error) {
    if (error.code === "42P01") {
      commentsAvailable = false;
      status.textContent = "No existe la tabla 'comments' en Supabase.";
      await loadPosts();
      return;
    }

    status.textContent = `No se pudo enviar: ${error.message}`;
    return;
  }

  form.reset();
  status.textContent = "Comentario publicado.";
  await loadPosts();
};

const renderPosts = (posts, commentsByPost) => {
  postsContainer.innerHTML = "";

  if (!posts.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  const postsByDayCount = {};

  for (const post of posts) {
    const dayKey = getDayKey(post.created_at);
    postsByDayCount[dayKey] = (postsByDayCount[dayKey] || 0) + 1;
  }

  let currentDayKey = "";

  for (const post of posts) {
    const dayKey = getDayKey(post.created_at);

    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      const dayCount = postsByDayCount[dayKey] || 0;
      const dayCountLabel = dayCount === 1 ? "1 noticia" : `${dayCount} noticias`;

      const dayHeader = document.createElement("h3");
      dayHeader.className = "day-header";
      dayHeader.textContent = `${formatDayHeader(dayKey)} (${dayCountLabel})`;
      postsContainer.appendChild(dayHeader);
    }

    const node = template.content.cloneNode(true);
    const card = node.querySelector(".post-card");
    const imageElement = node.querySelector(".post-image");

    if (post.image_url) {
      imageElement.src = post.image_url;
      imageElement.classList.remove("hidden");
      card.classList.remove("no-image");
    } else {
      card.classList.add("no-image");
    }

    node.querySelector(".post-date").textContent = formatDate(post.created_at);
    node.querySelector(".post-title").textContent = post.title;
    node.querySelector(".post-excerpt").textContent = post.excerpt;
    node.querySelector(".post-content").textContent = post.content;

    const commentsList = node.querySelector(".comments-list");
    const commentForm = node.querySelector(".comment-form");
    const commentStatus = node.querySelector(".comment-status");
    const postComments = commentsByPost.get(post.id) || [];
    renderComments(post, postComments, commentsList);

    if (!currentSession?.user) {
      commentForm.classList.add("hidden");
      commentStatus.classList.remove("hidden");
      commentStatus.textContent = "Inicia sesion para comentar con tu perfil.";
    } else {
      commentForm.classList.remove("hidden");
      commentStatus.textContent = "";
    }

    commentForm.addEventListener("submit", (event) => {
      handleCommentSubmit(event, post.id);
    });

    postsContainer.appendChild(node);
  }
};

const loadPosts = async () => {
  if (!hasValidSupabaseUrl()) {
    showToast("Falta configurar SUPABASE_URL en app.js con la URL real de tu proyecto.", "error");
    return;
  }

  const { data: postData, error: postsError } = await supabase
    .from("posts")
    .select("id, title, excerpt, content, image_url, created_at")
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error(postsError);

    if (postsError.code === "42P01") {
      showToast("La tabla 'posts' no existe en Supabase. Ejecuta el archivo supabase.sql en SQL Editor.", "error");
      return;
    }

    showToast(`No se pudieron cargar los posts: ${postsError.message}`, "error");
    return;
  }

  const posts = postData || [];
  const commentsByPost = new Map();

  if (posts.length) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: true });

    if (commentsError) {
      if (commentsError.code === "42P01") {
        commentsAvailable = false;
      } else {
        console.error(commentsError);
      }
    } else {
      commentsAvailable = true;

      for (const comment of commentsData || []) {
        if (!commentsByPost.has(comment.post_id)) {
          commentsByPost.set(comment.post_id, []);
        }

        commentsByPost.get(comment.post_id).push(comment);
      }
    }
  }

  if (isHomePage) {
    renderPosts(posts, commentsByPost);
  }
};

const setLoginPageUI = (session) => {
  if (!isLoginPage) {
    return;
  }

  if (!session) {
    authState.textContent = "No has iniciado sesion.";
    authSwitch?.classList.remove("hidden");
    loginPanel?.classList.remove("hidden");
    registerPanel?.classList.remove("hidden");
    setAuthMode(authMode);
    profilePanel?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    return;
  }

  authState.textContent = `Sesion activa como ${session.user.email}.`;
  authSwitch?.classList.add("hidden");
  loginPanel?.classList.add("hidden");
  registerPanel?.classList.add("hidden");
  profilePanel?.classList.remove("hidden");
  logoutBtn?.classList.remove("hidden");

  if (profileNameInput) {
    profileNameInput.value = getProfileName(session.user);
  }

  if (profileAvatarPreview) {
    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
      profilePreviewUrl = null;
    }

    profileAvatarPreview.src = getProfileAvatar(session.user);
  }
};

const setPublishPageUI = (session) => {
  if (!isPublishPage) {
    return;
  }

  const isAdmin = Boolean(session?.user && isAdminUser(session.user));

  if (!session) {
    authState.textContent = "Debes iniciar sesion para publicar.";
    postForm.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    loginRedirectLink?.classList.remove("hidden");
    return;
  }

  if (!isAdmin) {
    authState.textContent = `Sesion activa como ${session.user.email}, pero no tienes permiso de admin.`;
    postForm.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    loginRedirectLink?.classList.add("hidden");
    return;
  }

  authState.textContent = `Sesion iniciada como admin (${session.user.email}).`;
  postForm.classList.remove("hidden");
  logoutBtn?.classList.remove("hidden");
  loginRedirectLink?.classList.add("hidden");
};

const initAuth = async () => {
  if (!hasValidSupabaseUrl()) {
    if (authState) {
      authState.textContent = "Falta configurar SUPABASE_URL en app.js para poder iniciar sesion.";
    }

    return;
  }

  const { data } = await supabase.auth.getSession();
  currentSession = data.session;
  setAuthNavLabel(currentSession);
  setAdminNavVisibility(currentSession);
  setLoginPageUI(currentSession);
  setPublishPageUI(currentSession);

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    setAuthNavLabel(session);
    setAdminNavVisibility(session);
    setLoginPageUI(session);
    setPublishPageUI(session);

    if (isHomePage) {
      loadPosts();
    }
  });
};

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasValidSupabaseUrl()) {
      showToast("Configura SUPABASE_URL en app.js antes de iniciar sesion.", "error");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast(`Error de login: ${error.message}`, "error");
    } else {
      loginForm.reset();
      showToast("Sesion iniciada.", "success");
    }
  });
}

if (showLoginFormBtn) {
  showLoginFormBtn.addEventListener("click", () => {
    setAuthMode("login");
  });
}

if (showRegisterFormBtn) {
  showRegisterFormBtn.addEventListener("click", () => {
    setAuthMode("register");
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasValidSupabaseUrl()) {
      showToast("Configura SUPABASE_URL en app.js antes de registrarte.", "error");
      return;
    }

    const displayName = document.getElementById("registerName")?.value.trim() || "";
    const email = document.getElementById("registerEmail")?.value.trim() || "";
    const password = document.getElementById("registerPassword")?.value || "";

    if (!displayName) {
      showToast("El nombre visible es obligatorio.", "error");
      return;
    }

    if (password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }

    const hasValidOrigin = Boolean(window.location.origin && window.location.origin !== "null");
    const emailRedirectTo = hasValidOrigin
      ? `${window.location.origin}${EMAIL_CONFIRM_REDIRECT_PATH}`
      : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          display_name: displayName,
          avatar_url: DEFAULT_AVATAR
        }
      }
    });

    if (error) {
      showToast(`No se pudo crear la cuenta: ${error.message}`, "error");
      return;
    }

    registerForm.reset();

    if (!data.session) {
      showToast("Cuenta creada. Revisa tu correo para confirmar tu registro.", "success");
      return;
    }

    showToast("Cuenta creada y sesion iniciada.", "success");
  });
}

if (postForm) {
  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const excerpt = document.getElementById("excerpt").value.trim();
    const content = document.getElementById("content").value.trim();
    const imageFile = imageInput?.files?.[0] || null;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !isAdminUser(user)) {
      showToast("Solo el admin puede publicar.", "error");
      return;
    }

    let imageUrl = null;

    if (imageFile) {
      try {
        imageUrl = await uploadPostImage(imageFile, user.id);
      } catch (error) {
        if (error?.message?.includes("Bucket not found")) {
          showToast("No existe el bucket 'post-images'. Ejecuta de nuevo supabase.sql para crearlo.", "error");
          return;
        }

        showToast(`No se pudo subir la foto: ${error.message}`, "error");
        return;
      }
    }

    const { error } = await supabase.from("posts").insert({
      title,
      excerpt,
      content,
      image_url: imageUrl,
      author_email: user.email
    });

    if (error) {
      if (error.code === "42P01") {
        showToast("No existe la tabla 'posts'. Ejecuta el archivo supabase.sql en SQL Editor.", "error");
        return;
      }

      showToast(`No se pudo publicar: ${error.message}`, "error");
      return;
    }

    postForm.reset();
    if (postImagePreview) {
      postImagePreview.classList.add("hidden");
      postImagePreview.removeAttribute("src");
    }

    if (postPreviewUrl) {
      URL.revokeObjectURL(postPreviewUrl);
      postPreviewUrl = null;
    }

    if (imageInput) {
      imageInput.value = "";
    }

    showToast("Noticia publicada correctamente.", "success");
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showToast("Sesion cerrada.", "info");
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      showToast("Debes iniciar sesion para editar tu perfil.", "error");
      return;
    }

    const displayName = profileNameInput?.value.trim();

    if (!displayName) {
      showToast("El nombre de perfil no puede estar vacio.", "error");
      return;
    }

    let avatarUrl = getProfileAvatar(user);
    const avatarFile = profileAvatarInput?.files?.[0] || null;

    if (avatarFile) {
      try {
        avatarUrl = await uploadProfileImage(avatarFile, user.id);
      } catch (error) {
        if (error?.message?.includes("Bucket not found")) {
          showToast("No existe el bucket 'profile-images'. Crealo en Supabase Storage.", "error");
          return;
        }

        showToast(`No se pudo subir el avatar: ${error.message}`, "error");
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: avatarUrl
      }
    });

    if (error) {
      showToast(`No se pudo guardar el perfil: ${error.message}`, "error");
      return;
    }

    if (profileAvatarPreview) {
      profileAvatarPreview.src = avatarUrl;
    }

    if (profileAvatarInput) {
      profileAvatarInput.value = "";
    }

    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
      profilePreviewUrl = null;
    }

    showToast("Perfil actualizado.", "success");
  });
}

if (profileAvatarInput && profileAvatarPreview) {
  profileAvatarInput.addEventListener("change", () => {
    const file = profileAvatarInput.files?.[0] || null;

    if (!file) {
      if (currentSession?.user) {
        profileAvatarPreview.src = getProfileAvatar(currentSession.user);
      }

      return;
    }

    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
    }

    profilePreviewUrl = URL.createObjectURL(file);
    profileAvatarPreview.src = profilePreviewUrl;
  });
}

if (imageInput && postImagePreview) {
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0] || null;

    if (!file) {
      postImagePreview.classList.add("hidden");
      postImagePreview.removeAttribute("src");

      if (postPreviewUrl) {
        URL.revokeObjectURL(postPreviewUrl);
        postPreviewUrl = null;
      }

      return;
    }

    if (postPreviewUrl) {
      URL.revokeObjectURL(postPreviewUrl);
    }

    postPreviewUrl = URL.createObjectURL(file);
    postImagePreview.src = postPreviewUrl;
    postImagePreview.classList.remove("hidden");
  });
}

await initAuth();

if (isHomePage) {
  await loadPosts();
}
