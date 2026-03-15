const SUPABASE_URL = "https://hzsxlpzsknysjdpodpgg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xNazlHkI4DFI175UfCRt5Q_-EXtNKkL";
const POST_IMAGES_BUCKET = "post-images";

// This email gates who can publish posts after login.
const ADMIN_EMAIL = "admin@rsp.com";

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const postsContainer = document.getElementById("postsContainer");
const emptyState = document.getElementById("emptyState");
const template = document.getElementById("postTemplate");
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminPanel = document.getElementById("adminPanel");
const authState = document.getElementById("authState");
const loginForm = document.getElementById("loginForm");
const postForm = document.getElementById("postForm");
const logoutBtn = document.getElementById("logoutBtn");
const imageInput = document.getElementById("image");

const hasValidSupabaseUrl = () => !SUPABASE_URL.includes("YOUR-PROJECT-REF");

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

const renderPosts = (posts) => {
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
    const imageElement = node.querySelector(".post-image");

    if (post.image_url) {
      imageElement.src = post.image_url;
      imageElement.classList.remove("hidden");
    }

    node.querySelector(".post-date").textContent = formatDate(post.created_at);
    node.querySelector(".post-title").textContent = post.title;
    node.querySelector(".post-excerpt").textContent = post.excerpt;
    node.querySelector(".post-content").textContent = post.content;
    postsContainer.appendChild(node);
  }
};

const loadPosts = async () => {
  if (!hasValidSupabaseUrl()) {
    alert("Falta configurar SUPABASE_URL en app.js con la URL real de tu proyecto.");
    return;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, excerpt, content, image_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    if (error.code === "42P01") {
      alert("La tabla 'posts' no existe en Supabase. Ejecuta el archivo supabase.sql en SQL Editor.");
      return;
    }

    alert(`No se pudieron cargar los posts: ${error.message}`);
    return;
  }

  renderPosts(data || []);
};

const setAdminUI = (session) => {
  const email = session?.user?.email;
  const isAdmin = Boolean(email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (!session) {
    authState.textContent = "No has iniciado sesion.";
    loginForm.classList.remove("hidden");
    postForm.classList.add("hidden");
    return;
  }

  if (!isAdmin) {
    authState.textContent = `Sesion activa como ${email}, pero no tienes permiso de admin.`;
    loginForm.classList.add("hidden");
    postForm.classList.add("hidden");
    return;
  }

  authState.textContent = `Sesion iniciada como admin (${email}).`;
  loginForm.classList.add("hidden");
  postForm.classList.remove("hidden");
};

const initAuth = async () => {
  if (!hasValidSupabaseUrl()) {
    authState.textContent = "Falta configurar SUPABASE_URL en app.js para poder iniciar sesion.";
    return;
  }

  const { data } = await supabase.auth.getSession();
  setAdminUI(data.session);

  supabase.auth.onAuthStateChange((_event, session) => {
    setAdminUI(session);
  });
};

adminToggleBtn.addEventListener("click", () => {
  adminPanel.classList.toggle("hidden");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!hasValidSupabaseUrl()) {
    alert("Configura SUPABASE_URL en app.js antes de iniciar sesion.");
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert(`Error de login: ${error.message}`);
  } else {
    loginForm.reset();
  }
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const excerpt = document.getElementById("excerpt").value.trim();
  const content = document.getElementById("content").value.trim();
  const imageFile = imageInput.files?.[0] || null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("Solo el admin puede publicar.");
    return;
  }

  let imageUrl = null;

  if (imageFile) {
    try {
      imageUrl = await uploadPostImage(imageFile, user.id);
    } catch (error) {
      if (error?.message?.includes("Bucket not found")) {
        alert("No existe el bucket 'post-images'. Ejecuta de nuevo supabase.sql para crearlo.");
        return;
      }

      alert(`No se pudo subir la foto: ${error.message}`);
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
      alert("No existe la tabla 'posts'. Ejecuta el archivo supabase.sql en SQL Editor.");
      return;
    }

    alert(`No se pudo publicar: ${error.message}`);
    return;
  }

  postForm.reset();
  await loadPosts();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

await initAuth();
await loadPosts();
