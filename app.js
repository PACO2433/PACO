(() => {
  // ---------- Simple local DB helpers ----------
  const DB_KEYS = {
    USERS: 'nova_users',
    PRODUCTS: 'nova_products',
    ORDERS: 'nova_orders',
    CART: 'nova_cart',
    SESSION: 'nova_session'
  };

  const load = (k, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; }
    catch { return fallback; }
  };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---------- Initial data ----------
  let users = load(DB_KEYS.USERS, []);
  let products = load(DB_KEYS.PRODUCTS, []);
  let orders = load(DB_KEYS.ORDERS, []);
  let cart = load(DB_KEYS.CART, []);
  let session = load(DB_KEYS.SESSION, null);

  // seed products if empty
  if (!products.length) {
    products = [
      { id: 'p1', title: 'Cámara Full HD 1080p', price: 1200, img: 'https://picsum.photos/600?1', desc: '1080p, visión nocturna', sellerId: 'system' },
      { id: 'p2', title: 'Sensor Inteligente XT', price: 450, img: 'https://picsum.photos/600?2', desc: 'Alarma y notificaciones', sellerId: 'system' },
      { id: 'p3', title: 'Router Mesh Ultra', price: 900, img: 'https://picsum.photos/600?3', desc: 'Cobertura amplia', sellerId: 'system' }
    ];
    save(DB_KEYS.PRODUCTS, products);
  }

  // ---------- DOM refs ----------
  const $ = id => document.getElementById(id);
  const authSection = $('authSection');
  const shopSection = $('shopSection');
  const userLabel = $('userLabel');
  const btnOpenAuth = $('btnOpenAuth');
  const btnLogout = $('btnLogout');
  const tabLogin = $('tabLogin');
  const tabRegister = $('tabRegister');
  const formLogin = $('formLogin');
  const formRegister = $('formRegister');
  const formAddProduct = $('formAddProduct');
  const productsGrid = $('productsGrid');
  const viewFilter = $('viewFilter');
  const vendorPanel = $('vendorPanel');
  const sellerProducts = $('sellerProducts');
  const cartList = $('cartList');
  const subtotalEl = $('subtotal');
  const shippingEl = $('shipping');
  const totalEl = $('total');
  const btnCheckout = $('btnCheckout');
  const btnClearCart = $('btnClearCart');
  const modalCheckout = $('modalCheckout');
  const formCheckout = $('formCheckout');
  const btnCancelCheckout = $('btnCancelCheckout');
  const btnMySales = $('btnMySales');
  const btnInstall = $('btnInstall');

  // ---------- UI state ----------
  function setSession(s) {
    session = s;
    save(DB_KEYS.SESSION, s);
    updateAuthUI();
  }

  function updateAuthUI() {
    if (session) {
      authSection.classList.add('hidden');
      shopSection.classList.remove('hidden');
      userLabel.textContent = `${session.name || session.email} (${session.role})`;
      btnOpenAuth.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      if (session.role === 'vendedor') vendorPanel.classList.remove('hidden'); else vendorPanel.classList.add('hidden');
    } else {
      authSection.classList.remove('hidden');
      shopSection.classList.add('hidden');
      userLabel.textContent = 'Invitado';
      btnOpenAuth.classList.remove('hidden');
      btnLogout.classList.add('hidden');
      vendorPanel.classList.add('hidden');
    }
  }

  // ---------- Auth handlers ----------
  btnOpenAuth.addEventListener('click', () => {
    authSection.scrollIntoView({ behavior: 'smooth' });
  });
  btnLogout.addEventListener('click', () => {
    if (!confirm('¿Cerrar sesión?')) return;
    setSession(null);
  });

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden'); formRegister.classList.add('hidden');
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden'); formLogin.classList.add('hidden');
  });

  // login
  formLogin.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const email = $('loginEmail').value.trim().toLowerCase();
    const pass = $('loginPass').value;
    const role = $('loginRole').value;
    const user = users.find(u => u.email === email && u.password === pass && u.role === role);
    if (!user) { alert('Credenciales incorrectas (revisa email/clave/rol).'); return; }
    setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    renderAll();
  });

  // register
  formRegister.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim().toLowerCase();
    const pass = $('regPass').value;
    const role = $('regRole').value;
    if (!email || !pass) return alert('Completa email y contraseña');
    if (users.find(u => u.email === email)) return alert('Email ya registrado');
    const id = 'u' + Date.now().toString(36);
    const newUser = { id, name: name || email.split('@')[0], email, password: pass, role };
    users.push(newUser);
    save(DB_KEYS.USERS, users);
    setSession({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
    renderAll();
  });

  // ---------- Products ----------
  function renderProducts() {
    productsGrid.innerHTML = '';
    const filter = viewFilter.value;
    let list = products.slice().reverse();
    if (filter === 'mine') {
      if (!session || session.role !== 'vendedor') { productsGrid.innerHTML = '<div class="muted">Inicia sesión como vendedor para ver tus productos.</div>'; return; }
      list = list.filter(p => p.sellerId === session.id);
    }
    if (!list.length) { productsGrid.innerHTML = '<div class="muted">No hay productos</div>'; return; }
    list.forEach(p => {
      const div = document.createElement('div');
      div.className = 'product-card';
      div.innerHTML = `
        <img src="${p.img || 'https://picsum.photos/500?random=' + Math.floor(Math.random()*999)}" alt="">
        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escapeHtml(p.title)}</strong>
            <span style="color:var(--accent)">$${Number(p.price).toFixed(2)}</span>
          </div>
          <div class="muted" style="margin-top:6px">${escapeHtml(p.desc || '')}</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn" data-buy="${p.id}">Agregar</button>
            ${session && session.role === 'vendedor' && p.sellerId === session.id ? `<button class="btn ghost" data-del="${p.id}">Eliminar</button>` : ''}
          </div>
        </div>
      `;
      productsGrid.appendChild(div);
    });
  }

  // event delegation for buy/delete
  productsGrid.addEventListener('click', (e) => {
    const buy = e.target.closest('[data-buy]');
    if (buy) { addToCart(buy.getAttribute('data-buy')); return; }
    const del = e.target.closest('[data-del]');
    if (del) { deleteProduct(del.getAttribute('data-del')); return; }
  });

  // ---------- Vendor add product ----------
  formAddProduct.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!session || session.role !== 'vendedor') { alert('Debes iniciar sesión como vendedor'); return; }
    const title = $('pTitle').value.trim();
    const price = Number($('pPrice').value) || 0;
    const img = $('pImg').value.trim();
    const desc = $('pDesc').value.trim();
    if (!title || !price) return alert('Nombre y precio son obligatorios');
    const id = 'p' + Date.now().toString(36);
    const newProd = { id, title, price, img, desc, sellerId: session.id };
    products.push(newProd);
    save(DB_KEYS.PRODUCTS, products);
    $('pTitle').value = ''; $('pPrice').value = ''; $('pImg').value = ''; $('pDesc').value = '';
    renderAll();
  });

  function deleteProduct(id) {
    if (!confirm('Eliminar producto?')) return;
    products = products.filter(p => p.id !== id);
    save(DB_KEYS.PRODUCTS, products);
    renderAll();
  }

  // ---------- Cart ----------
  function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return alert('Producto no encontrado');
    const it = cart.find(i => i.productId === productId);
    if (it) it.qty += 1;
    else cart.push({ productId, qty: 1 });
    save(DB_KEYS.CART, cart);
    renderCart();
  }

  function renderCart() {
    cartList.innerHTML = '';
    if (!cart.length) { cartList.innerHTML = '<div class="muted">No hay artículos</div>'; subtotalEl.textContent = '$0'; totalEl.textContent = '$0'; return; }
    let subtotal = 0;
    cart.forEach(ci => {
      const p = products.find(x => x.id === ci.productId);
      if (!p) return;
      subtotal += p.price * ci.qty;
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${p.img || 'https://picsum.photos/200'}" alt="">
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(p.title)}</div>
          <div class="muted">$${p.price} x ${ci.qty} = $${(p.price*ci.qty).toFixed(2)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn small" data-inc="${p.id}">+</button>
          <button class="btn small ghost" data-dec="${p.id}">-</button>
        </div>
      `;
      cartList.appendChild(div);
    });
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    const ship = 40;
    shippingEl.textContent = `$${ship}`;
    totalEl.textContent = `$${(subtotal + ship).toFixed(2)}`;
  }

  // inc/dec handlers
  cartList.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    if (inc) { changeQty(inc.getAttribute('data-inc'), +1); return; }
    const dec = e.target.closest('[data-dec]');
    if (dec) { changeQty(dec.getAttribute('data-dec'), -1); return; }
  });

  function changeQty(productId, delta) {
    const it = cart.find(i => i.productId === productId);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) cart = cart.filter(i => i.productId !== productId);
    save(DB_KEYS.CART, cart);
    renderCart();
  }

  btnClearCart.addEventListener('click', () => {
    if (!cart.length) return;
    if (!confirm('Vaciar carrito?')) return;
    cart = []; save(DB_KEYS.CART, cart); renderCart();
  });

  // ---------- Checkout ----------
  btnCheckout.addEventListener('click', () => {
    if (!session) { alert('Inicia sesión para comprar'); return; }
    if (!cart.length) { alert('Carrito vacío'); return; }
    modalCheckout.classList.remove('hidden');
  });
  btnCancelCheckout.addEventListener('click', () => modalCheckout.classList.add('hidden'));

  formCheckout.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(formCheckout);
    const fullname = fd.get('fullname').trim();
    const address = fd.get('address').trim();
    const phone = fd.get('phone').trim();
    const payment = fd.get('payment');
    if (!fullname || !address || !phone || !payment) return alert('Completa todos los campos');
    // build order
    const items = cart.map(ci => {
      const p = products.find(x => x.id === ci.productId);
      return { productId: ci.productId, title: p?.title || '', price: p?.price || 0, qty: ci.qty, sellerId: p?.sellerId || null };
    });
    const subtotal = items.reduce((s,it) => s + (it.price * it.qty), 0);
    const shipping = 40;
    const total = subtotal + shipping;
    const order = {
      id: 'o' + Date.now().toString(36),
      buyerId: session.id,
      buyerEmail: session.email,
      items,
      subtotal, shipping, total,
      info: { fullname, address, phone, payment },
      status: 'pagado_simulado',
      createdAt: new Date().toISOString()
    };
    orders.push(order);
    save(DB_KEYS.ORDERS, orders);
    // duplicate order per seller
    const sellersMap = {};
    items.forEach(it => {
      const s = it.sellerId || 'system';
      sellersMap[s] = sellersMap[s] || [];
      sellersMap[s].push(it);
    });
    // attach sellerOrders under each seller in localStorage (simple map)
    const sellerOrders = JSON.parse(localStorage.getItem('nova_sellers_orders') || '{}');
    Object.keys(sellersMap).forEach(sid => {
      sellerOrders[sid] = sellerOrders[sid] || [];
      sellerOrders[sid].push({ orderId: order.id, items: sellersMap[sid], buyer: order.info, total: sellersMap[sid].reduce((a,b)=>a+(b.price*b.qty),0), createdAt: order.createdAt });
    });
    localStorage.setItem('nova_sellers_orders', JSON.stringify(sellerOrders));
    // clear cart
    cart = []; save(DB_KEYS.CART, cart);
    renderCart();
    modalCheckout.classList.add('hidden');
    alert('Pago simulado realizado. ID: ' + order.id);
  });

  // vendor view: my sales
  btnMySales.addEventListener('click', () => {
    if (!session || session.role !== 'vendedor') return alert('Solo vendedores');
    const sellerOrders = JSON.parse(localStorage.getItem('nova_sellers_orders') || '{}');
    const my = sellerOrders[session.id] || [];
    if (!my.length) return alert('No tienes pedidos aún');
    let out = 'Pedidos:\n\n';
    my.forEach(m => {
      out += `Pedido: ${m.orderId} — Total: $${m.total}\nCliente: ${m.buyer.fullname}\nItems:\n`;
      m.items.forEach(i => out += ` - ${i.title} x ${i.qty}\n`);
      out += '\n';
    });
    alert(out);
  });

  // ---------- Utilities ----------
  function renderSellerProducts() {
    if (!session || session.role !== 'vendedor') { sellerProducts.innerHTML = ''; return; }
    const mine = products.filter(p => p.sellerId === session.id);
    sellerProducts.innerHTML = '';
    if (!mine.length) { sellerProducts.innerHTML = '<div class="muted">No tienes productos</div>'; return; }
    mine.forEach(p => {
      const d = document.createElement('div');
      d.className = 'product-card';
      d.innerHTML = `<img src="${p.img || 'https://picsum.photos/400'}"><div style="margin-top:8px"><strong>${escapeHtml(p.title)}</strong><div class="muted">$${p.price}</div></div>`;
      sellerProducts.appendChild(d);
    });
  }

  function renderAll() {
    products = load(DB_KEYS.PRODUCTS, products);
    users = load(DB_KEYS.USERS, users);
    orders = load(DB_KEYS.ORDERS, orders);
    cart = load(DB_KEYS.CART, cart);
    session = load(DB_KEYS.SESSION, session);
    updateAuthUI();
    renderProducts();
    renderCart();
    renderSellerProducts();
  }

  // change view filter
  viewFilter.addEventListener('change', renderProducts);

  // escape html
  function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // initial render
  renderAll();

  // ---------- PWA install handling ----------
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.classList.remove('hidden');
  });
  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.classList.add('hidden');
  });

  // ---------- Service worker registration ----------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{/* ignore */});
  }

  // expose small helpers for console/debug if needed
  window.NOVA = { load, save, renderAll };

})();
