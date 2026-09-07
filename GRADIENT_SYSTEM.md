# Brand Gradient System

## Definizione Esatta del Gradiente

### CSS Variable
```css
--gradient-brand: linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
```

### Colori per Tema

**Light Mode:**
- Start: `#4F46E5` (Indigo)
- End: `#0D9488` (Teal)
- Direction: 180° (top to bottom, vertical)

**Dark Mode:**
- Start: `#818CF8` (Indigo chiaro)
- End: `#2DD4BF` (Teal chiaro)
- Direction: 180° (top to bottom, vertical)

---

## Applicazioni nel Sito

### Header (style.css)
1. **Logo testuale** - Text gradient (`background-clip: text`)
2. **Logo accent marker** (rettangolo a sinistra del logo)
3. **Nav link attivo** - Background solido con shadow glow

### Sidebar (sidebar.css)
1. **Badge ruolo** ("Data Scientist") - Background solido
2. **Social links** (GitHub, LinkedIn) - Text gradient
3. **Email, Website, Phone links** - Text gradient

### Content (page-content.css)
1. **Titolo principale** (h1 "Hello, I'm Francesco!") - Text gradient
2. **Titoli sezioni** (.content-title: "What I Do", "Experience", "Technologies") - Text gradient

---

## Utilizzo delle Classi CSS Utility

File: `assets/css/accent-gradient.css`

### Applicare il gradiente come testo
```html
<h1 class="text-gradient">Titolo con gradiente</h1>
```

### Applicare il gradiente come sfondo
```html
<button class="bg-gradient">Pulsante</button>
```

### Applicare il gradiente come bordo
```html
<div class="border-gradient">Contenuto</div>
```

---

## Coerenza e Leggibilità

✅ **Alto Contrasto Garantito:**
- Text gradient: il testo usa colori saturi (indigo → teal) su sfondi chiari/scuri
- Background gradient: il testo è sempre bianco (#FFFFFF) su sfondo sfumato
- Responsive: i colori si adattano automaticamente al tema (light/dark mode)

✅ **Stile Moderno e Sobrio:**
- Gradiente verticale (180°) per eleganza senza eccessi
- Applicato solo ai punti focali dell'interfaccia
- Mantiene la gerarchia visiva e la leggibilità

---

## File Modificati

| File | Modifica |
|------|----------|
| `assets/css/colors.css` | Aggiunta variabile `--gradient-brand` per entrambi i temi |
| `assets/css/style.css` | Applicato gradiente al logo e nav link attivo |
| `assets/css/sidebar.css` | Applicato gradiente a badge, social links e link contatti |
| `assets/css/page-content.css` | Applicato gradiente a h1 e titoli sezioni |
| `assets/css/accent-gradient.css` | **Nuovo**: classi utility riutilizzabili |
| `index.html`, `projects.html`, `courses.html`, `certifications.html` | Collegato accent-gradient.css |
