import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import icons from "./icons.json";
import { navigation, type Blocks, type GlobalContent, type IconContent, type PageName } from "./content";

export function Icon({ value, className = "" }: { value: IconContent; className?: string }) {
  if (value.icon === "image") return value.image.src
    ? <img className={className || undefined} src={value.image.src} alt={value.image.alt} title={value.label || undefined} /> : null;
  const definition = icons[value.icon as keyof typeof icons];
  return definition ? <i className={`${definition.className} ${className}`.trim()} role="img" aria-label={value.label} title={value.label} /> : null;
}

export function Header({ value, page }: { value: GlobalContent; page: PageName }) {
  const header = useRef<HTMLElement>(null);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const doc = header.current!.ownerDocument;
    setDark(doc.documentElement.classList.contains("dark-mode"));
    const win = doc.defaultView!;
    let lastY = win.scrollY;
    let frame = 0;
    const scroll = () => {
      if (frame) return;
      frame = win.requestAnimationFrame(() => {
        const y = win.scrollY;
        if (y <= 40 || y - lastY < -4) header.current?.classList.remove("is-compact");
        else if (y - lastY > 8) header.current?.classList.add("is-compact");
        lastY = y;
        frame = 0;
      });
    };
    win.addEventListener("scroll", scroll, { passive: true });
    return () => { win.removeEventListener("scroll", scroll); win.cancelAnimationFrame(frame); };
  }, []);
  function toggleTheme() {
    const doc = header.current!.ownerDocument;
    const apply = () => {
      const next = doc.documentElement.classList.toggle("dark-mode");
      setDark(next);
      try { doc.defaultView!.localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* Storage can be disabled. */ }
    };
    if (doc.startViewTransition) doc.startViewTransition(apply); else apply();
  }
  return <header className="site-header is-visible" id="header-container" ref={header}>
    <a href="/index.html" className="site-logo">{value.name}</a>
    <nav className="main-nav">{navigation.map(item => <a key={item.key} href={item.href}
      className={`nav-link${page === item.key ? " active" : ""}`}>{value.navigation[item.key]}</a>)}</nav>
    <button type="button" id="theme-toggle" className="theme-toggle" aria-label={value.themeLabel} onClick={toggleTheme}>
      <i className={`fas ${dark ? "fa-sun" : "fa-moon"}`} />
    </button>
  </header>;
}

export function Sidebar({ value }: { value: GlobalContent }) {
  return <div id="sidebar-container" className="is-visible"><aside className="profile-sidebar">
    <div className="profile-img-wrapper">{value.portrait.src && <img src={value.portrait.src} alt={value.portrait.alt} />}</div>
    <div className="information-wrapper">
      <div className="profile-name"><h2>{value.name}</h2></div>
      <div className="badge">{value.role}</div>
      <div className="social-links">{value.socials.map((social, index) => <Fragment key={index}>{index > 0 && " "}<a href={social.href}
        className="social-link" aria-label={social.label} title={social.label} target="_blank" rel="noopener noreferrer">
        <Icon value={social.icon} /></a></Fragment>)}</div>
      {value.contacts.map((contact, index) => <p key={index}><strong>{contact.label}</strong>{" "}
        {contact.href ? <a href={contact.href}>{contact.value}</a> : contact.value}</p>)}
    </div>
  </aside></div>;
}

export function SiteShell({ value, page, children }: { value: GlobalContent; page: PageName; children: ReactNode }) {
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = main.current!;
    const timers = Array.from(element.children).map((child, index) => setTimeout(() => child.classList.add("is-visible"), 100 + index * 60));
    return () => timers.forEach(clearTimeout);
  }, [page, children]);
  return <><Header value={value} page={page} /><div className="content-wrapper"><Sidebar value={value} />
    <main ref={main} className="is-visible">{children}</main>
  </div></>;
}

export function Heading({ title }: Blocks["Heading"]) { return <h1 className="typewriter-animation">{title}</h1>; }
export function Intro({ title, description }: Blocks["Intro"]) { return <><Heading title={title} /><p>{description}</p></>; }

export function durationText(startValue: string, endValue: string, now = new Date()) {
  if (!startValue) return "";
  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : now;
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  return parts.length ? ` (${parts.join(", ")})` : "";
}
function Duration({ start, end }: { start: string; end: string }) {
  const [value, setValue] = useState("");
  useEffect(() => { setValue(durationText(start, end)); }, [start, end]);
  return <span className="job-duration" data-start={start} data-end={end || undefined}>{value}</span>;
}
export function Timeline({ title, items }: Blocks["Timeline"]) {
  return <div className="content-container"><div className="content-title">{title}</div><div className="content-list">
    <ul className="timeline">{items.map((item, index) => <li className="timeline-item" key={index}>
      <div className="list-title">{item.title}</div><div className="list-subtitle">{item.subtitle}{" "}<Duration start={item.start} end={item.end} /></div>
      {item.details.length > 0 && <ul className="timeline-details">{item.details.map((detail, i) => <li key={i}>{detail.text}</li>)}</ul>}
    </li>)}</ul>
  </div></div>;
}
export function Technologies({ title, items }: Blocks["Technologies"]) {
  return <div className="content-container"><div className="content-title">{title}</div><div className="content-list">
    <div className="skills-grid">{items.map((item, index) => <Icon key={index} value={item} className="skill-icon" />)}</div>
  </div></div>;
}
export function Research({ items }: Blocks["Research"]) {
  return <>{items.map((item, index) => <Fragment key={index}><div className="project-container">
    <div className="project-title">{item.title}{item.href && <>{" "}<a href={item.href} className="project-link"><Icon value={item.icon} /></a></>}</div>
    <div className="project-description">{item.description}</div>
  </div>{index < items.length - 1 && <hr className="separation-line-h-full" />}</Fragment>)}</>;
}
export function Projects({ items }: Blocks["Projects"]) {
  return <>{items.map((item, index) => <Fragment key={index}><div className="project-container">
    <div className="project-heading"><div className="project-title">{item.title}</div><div className="project-technologies">
      {item.technologies.map((technology, i) => <Icon value={technology} key={i} />)}</div></div>
    <div className="project-description">{item.description}</div>
  </div><hr className="separation-line-h-full" /></Fragment>)}</>;
}
export function Education({ degrees, certificationsTitle, certifications }: Blocks["Education"]) {
  return <div className="content-container">
    <section className="degree-board" aria-label="Degrees"><div className="degree-board__surface">
      {degrees.map((degree, index) => <article key={index} className={`diploma-note diploma-note--${index % 2 ? "bachelor" : "master"}`}>
        <span className="pushpin" aria-hidden="true" /><div className="diploma-upload__image">{degree.image.src && <img src={degree.image.src} alt={degree.image.alt} />}</div>
        <div className="diploma-note__caption"><span>{degree.institution}</span><h3>{degree.title}</h3>{degree.grade && <p>{degree.grade}</p>}</div>
      </article>)}
    </div></section>
    <div className="content-title">{certificationsTitle}</div><section className="certs-section"><div className="honeycomb-grid" id="honeycomb">
      <div className="honeycomb-row">{certifications.map((cert, index) => <div className="hex-cell" key={index}>
        <div className="hex-badge" style={{ animationDelay: `${([0, 3, 1, 2][index] ?? index) * 70}ms` } as CSSProperties}><div className="hex-border"><div className="hex-inner">
          <div className="badge-img-wrapper"><Icon value={cert.icon} /></div><div className="badge-title">{cert.title}</div>
          <div className="badge-subtitle">{cert.issuer}<br />{cert.year}</div>
        </div></div></div>
      </div>)}</div>
    </div></section>
  </div>;
}
export function ErrorPage(props: Blocks["ErrorPage"]) {
  return <div className="error-container"><div className="error-emoji">{props.emoji}</div><h1 className="error-code">{props.code}</h1>
    <h2 className="error-message">{props.title}</h2><p className="error-description">{props.description.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line.text}</Fragment>)}</p>
    <div className="error-actions"><a href="/index.html" className="error-button">{props.homeLabel}</a>
      <a href="/projects.html" className="error-button secondary">{props.projectsLabel}</a></div>
    <p style={{ marginTop: "3rem", fontSize: 13, color: "var(--text-color-muted)" }}>{props.contactPrefix}{" "}
      <a href={props.contactHref} style={{ color: "var(--accent-primary)", textDecoration: "none" }}>{props.contactLabel}</a>{props.contactSuffix}</p>
  </div>;
}
