/* =============================================================
 * scripts.js ─ Funciones globales del sitio Mecatrónica IBERO
 * -------------------------------------------------------------
 * ▸ Navbar móvil (cierra al hacer clic en enlace)
 * ▸ Navbar hover-desktop con retardo
 * ▸ Vista “Plan de estudios”
 *      - Informativa (por defecto)
 *      - Seriaciones y prerrequisitos
 *      - Calculadora de créditos / horas
 * -------------------------------------------------------------
 */

window.addEventListener('DOMContentLoaded', () => {



  /* ==========================================================
   * 1. NAVBAR COMPORTAMIENTO
   * ==========================================================*/
  const navbarToggler = document.querySelector('.navbar-toggler');

  // ── 1.a Cerrar menú colapsable al seleccionar un enlace
  document.querySelectorAll('#navbarResponsive .nav-link')
    .forEach(link => link.addEventListener('click', () => {
      const isMobile = window.getComputedStyle(navbarToggler).display !== 'none';
      const isDropdown = link.classList.contains('dropdown-toggle');
      if (isMobile && !isDropdown) navbarToggler.click();
    }));

  // ── 1.b Dropdown on‑hover para ≥ lg
  document.querySelectorAll('.navbar .dropdown').forEach(drop => {
    const trigger  = drop.querySelector('.dropdown-toggle');
    const bsDrop   = new bootstrap.Dropdown(trigger, { autoClose: 'outside' });
    let hideTimer;

    drop.addEventListener('mouseenter', () => {
      if (window.innerWidth >= 992) { clearTimeout(hideTimer); bsDrop.show(); }
    });
    drop.addEventListener('mouseleave', () => {
      if (window.innerWidth >= 992) {
        hideTimer = setTimeout(() => bsDrop.hide(), 100);
      }
    });
  });







  /* ==========================================================
   * 2. PLAN DE ESTUDIOS (solo si #planGrid existe)
   * ==========================================================*/
  const grid = document.getElementById('planGrid');
  if (!grid) return;  // estamos en otra página

  // ----- Referencias DOM comunes -----
  const viewSel     = document.getElementById('planView');
  const noteLabel   = document.getElementById('planNote');
  const controlsBox = document.getElementById('calcControls');
  const summaryBox  = document.getElementById('calcSummary');
  const btnDone     = document.getElementById('brushDone');
  const btnTodo     = document.getElementById('brushTodo');
  const btnClear    = document.getElementById('brushClear');

  // ----- Modal -----
  const mTitle = document.getElementById('courseModalTitle');
  const mInfo  = document.getElementById('courseInfo');
  const mSyl   = document.getElementById('courseSyllabus');
  const mDesc  = document.getElementById('courseDesc');
  const modal  = new bootstrap.Modal(document.getElementById('courseModal'));

  // Estado de calculadora
  const calcState = { mode: 'cursado', map: new Map() };
  const courseDict = {};

  /* ====== Seriaciones: helpers ================================= */
    function collectChain(key, set = new Set()){
    if(!key || set.has(key)) return;
    set.add(key);

    const prereq = courseDict[key]?.prereq || [];
    prereq.forEach(k => collectChain(k, set));
    return set;
    }

    function clearChainHighlight(){
    document
        .querySelectorAll('.course-card.chain')
        .forEach(c => c.classList.remove('chain'));
    }


  /* ---------------- Helpers ---------------- */
  function createCard(course){
    const d = document.createElement('div');
    d.className = 'course-card';
    d.innerHTML = `${course.name}<br><small>${course.clave}</small>`;
    d.dataset.bsToggle = 'tooltip';
    d.title            = `${course.clave} · ${course.credits} cr`;
    d.dataset.key      = course.clave;
    d.dataset.credits  = course.credits;
    d.addEventListener('click', handleCardClick);
    courseDict[course.clave] = course;
    return d;
  }

    function showModal(c){
    mTitle.textContent = `${c.name} (${c.clave})`;

    /* fila laboratorio */
    const labRow = c.lab
        ? `<li class="list-group-item d-flex justify-content-between align-items-center">
            <span>
            <strong>Laboratorio:</strong> Sí (<span class="fw-semibold">${c.lab_clave}</span>)
            </span>
            <button class="btn btn-outline-secondary btn-copy btn-sm"
                    onclick="navigator.clipboard.writeText('${c.lab_clave}')">
            <i class="bi bi-clipboard"></i>
            </button>
        </li>`
        : '<li class="list-group-item"><strong>Laboratorio:</strong> No</li>';

    /* cuerpo del listado */
    mInfo.innerHTML = `
        <li class="list-group-item d-flex justify-content-between align-items-center">
        <span><strong>Clave:</strong> <span class="fw-semibold">${c.clave}</span></span>
        <button class="btn btn-outline-secondary btn-copy btn-sm"
                onclick="navigator.clipboard.writeText('${c.clave}')">
            <i class="bi bi-clipboard"></i>
        </button>
        </li>
        <li class="list-group-item"><strong>Sigla:</strong> ${c.sigla}</li>
        <li class="list-group-item"><strong>Créditos:</strong> ${c.credits ?? '—'}</li>
        <li class="list-group-item"><strong>Horas con académico:</strong> ${c.hours.with_prof}</li>
        <li class="list-group-item"><strong>Horas independientes:</strong> ${c.hours.independent}</li>
        ${labRow}
        <li class="list-group-item"><strong>Área:</strong> ${c.area}</li>
        <li class="list-group-item"><strong>Prerrequisitos:</strong> ${c.prereq.length ? c.prereq.join(', ') : 'Ninguno'}</li>`;

    mSyl.textContent  = c.syllabus    || 'En construcción';
    mDesc.textContent = c.description || 'Próximamente';
    modal.show();
    }


  /* ----------- Cargar plan ----------- */
  axios.get('../vida_universitaria/plan_de_estudios.json')
    .then(res => {
      res.data.semesters.forEach(sem => {
        const col = document.createElement('div'); col.className = 'sem-col';

        const hdr = document.createElement('div');
        hdr.className = 'sem-header';
        hdr.textContent = `Semestre ${sem.number}`;
        hdr.addEventListener('click', () => {
          if(viewSel.value === 'calc') col.querySelectorAll('.course-card').forEach(c => c.click());
        });
        col.appendChild(hdr);

        sem.courses.forEach(c => col.appendChild(createCard(c)) );
        grid.appendChild(col);
      });
      document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
    })
    .catch(err => { console.error(err); grid.innerHTML = '<div class="alert alert-danger">No se pudo cargar el plan de estudios</div>'; });


 /* ---------------- Brochas ---------------- */
  if(btnDone && btnTodo){
    btnDone.addEventListener('click', () => { calcState.mode='cursado';  toggleBrush(btnDone,btnTodo); });
    btnTodo.addEventListener('click', () => { calcState.mode='porcursar'; toggleBrush(btnTodo,btnDone); });
  }
  if(btnClear){
    btnClear.addEventListener('click', () => {
      calcState.map.clear();
      document.querySelectorAll('.course-card').forEach(c => c.classList.remove('cursado','porcursar'));
      updateSummary();
    });
  }

  function toggleBrush(active,inactive){
    active.classList.add('active');
    inactive.classList.remove('active');
  }

  /* ------------- Clic tarjeta ------------- */
    function handleCardClick(e){
        const card = e.currentTarget;
        const key  = card.dataset.key;

        /* 1. Vista SERIACIONES ------------------------------------------------ */
        if(viewSel.value === 'chain'){
            clearChainHighlight();
            const chain = collectChain(key);          // reúne prerequisitos
            chain.forEach(k=>{
            const c = document.querySelector(`[data-key="${CSS.escape(k)}"]`);
            c?.classList.add('chain');
            });
            return;                                   // NO modal
        }

        /* 2. Vista CALCULADORA ------------------------------------------------- */
        if(viewSel.value === 'calc'){
            calcState.map.set(key, calcState.mode);
            card.classList.remove('cursado','porcursar');
            card.classList.add(calcState.mode === 'cursado' ? 'cursado' : 'porcursar');
            updateSummary();
            return;                                   // NO modal
        }

        /* 3. Vista INFORMATIVA (default) -------------------------------------- */
        showModal(courseDict[key]);
    }




  /* ------------- Resumen ------------- */
  function updateSummary(){
    let doneCnt=0, doneCr=0, todoCnt=0, todoCr=0;
    calcState.map.forEach((v,k) => {
      const cr = Number(document.querySelector(`[data-key="${CSS.escape(k)}"]`)?.dataset.credits || 0);
      if(v==='cursado'){ doneCnt++; doneCr+=cr; } else { todoCnt++; todoCr+=cr; }
    });
    summaryBox.innerHTML = `
      <hr class="my-2"><span class="text-danger">Has cursado:</span> <strong>${doneCnt}/51</strong> materias · ${doneCr}/410 créditos<br>
      <span class="text-success">Piensas cursar:</span> <strong>+${todoCnt}</strong> materias · +${todoCr} créditos<br>
      <hr class="my-2"><span>Total:</span> <strong>${doneCnt+todoCnt}/51</strong> materias · ${doneCr+todoCr}/410 créditos`;
  }



  /* ------------- Cambiar vista ------------- */
  function switchView(){
    clearChainHighlight();
    const v = viewSel.value;

    /* --- RESET visual y de datos -------------------------------- */
    // a) quita cualquier borde morado o de calculadora
    document.querySelectorAll('.course-card')
            .forEach(c => c.classList.remove('cursado','porcursar','chain'));

    // b) vacía el estado de la calculadora y borra texto del resumen
    calcState.map.clear();
    if(summaryBox) summaryBox.textContent = '';

    if(v==='info'){
      grid.style.display      = '';
      noteLabel.style.display = '';
      controlsBox.classList.add('d-none');
    }
    else if(v==='calc'){
      grid.style.display      = '';
      noteLabel.style.display = 'none';
      controlsBox.classList.remove('d-none');
      updateSummary();
    }
    else if(v === 'chain'){
    grid.style.display='';
    noteLabel.style.display='none';
    controlsBox.classList.add('d-none');  // sin brochas
    }
    else{ // vista 'peer' o futura
      grid.style.display      = 'none';
      noteLabel.style.display = 'none';
      controlsBox.classList.add('d-none');
    }
    /* --- desplazar a la sección Plan -------------------------- */
    const planSection = document.getElementById('plan');          // <section id="plan">
    const navBar      = document.getElementById('mainNav');       // navbar fijo

    if (planSection && navBar){
    const offset   = navBar.offsetHeight + 16;                  // +16 px de aire
    const targetY  = planSection.getBoundingClientRect().top
                    + window.pageYOffset - offset;

    window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }

  viewSel.addEventListener('change', switchView);
  switchView(); // inicial
});














document.addEventListener('DOMContentLoaded', async () => {
  const dataUrl   = 'logros.json';
  const thumbsBox = document.getElementById('thumbs');
  const inner     = document.querySelector('#carouselLogros .carousel-inner');
  const response  = await fetch(dataUrl);
  const logros    = await response.json();

  // Construir slides y miniaturas
  logros.forEach((l, i) => {
    /* --- Slide --- */
    const item = document.createElement('div');
    item.className = `carousel-item${i === 0 ? ' active' : ''}`;
    item.innerHTML = `
      <img src="${l.img}" class="d-block w-100 object-fit-cover" alt="${l.title}">
      <div class="carousel-caption text-start">
        <h5 class="fw-semibold">${l.title}</h5>
        <p>${l.desc}</p>
      </div>`;
    inner.appendChild(item);

    /* --- Miniatura --- */
    const thumb = document.createElement('img');
    thumb.src = l.img;
    thumb.dataset.index = i;
    thumb.className = `img-fluid rounded${i === 0 ? ' active' : ''}`;
    thumbsBox.appendChild(thumb);
  });

  // Iniciar carrusel a 6 s
  const carouselEl = document.getElementById('carouselLogros');
  const carousel   = new bootstrap.Carousel(carouselEl, {
    interval: 6000,
    ride: 'carousel',
    touch: true
  });

  // Clic en miniatura → ir al slide correspondiente
  thumbsBox.addEventListener('click', e => {
    if (e.target.tagName !== 'IMG') return;
    carousel.to(+e.target.dataset.index);
  });

  // Cambiar borde activo cuando se mueve el carrusel
  carouselEl.addEventListener('slid.bs.carousel', e => {
    thumbsBox.querySelector('img.active')?.classList.remove('active');
    thumbsBox
      .querySelector(`img[data-index="${e.to}"]`)
      .classList.add('active');
  });
});
