import "./Footer.css";

type Person = {
  name: string;
  github: string;
  linkedin: string;
  role: string;
};

const people: Person[] = [
  {
    name: "Levin Fankhauser",
    github: "https://github.com/levin-fankhauser",
    linkedin: "https://www.linkedin.com/in/levin-fankhauser/",
    role: "Middleware & Integration",
  },
  {
    name: "Lorenz Boss",
    github: "https://github.com/lorenzboss",
    linkedin: "https://www.linkedin.com/in/lorenz-boss-229b06309/",
    role: "Backend",
  },
  {
    name: "Tobias Topp",
    github: "https://github.com/ToppTobi",
    linkedin: "https://www.linkedin.com/in/tobias-topp-95b27b281/",
    role: "Frontend",
  },
];

function IconGitHub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.11.79-.25.79-.56v-2.02c-3.2.7-3.87-1.37-3.87-1.37-.53-1.35-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.18.08 1.8 1.22 1.8 1.22 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.75-1.56-2.56-.29-5.26-1.28-5.26-5.66 0-1.25.45-2.27 1.2-3.07-.12-.29-.52-1.45.11-3.02 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.57.23 2.73.11 3.02.75.8 1.2 1.82 1.2 3.07 0 4.39-2.71 5.36-5.29 5.65.42.36.79 1.06.79 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z"
      />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.86-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.34V9h3.4v1.56h.05c.47-.89 1.63-1.83 3.35-1.83 3.58 0 4.24 2.36 4.24 5.43v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM3.56 20.45h3.55V9H3.56v11.45Z"
      />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <ul className="credits" aria-label="Credits">
          {people.map((p) => (
            <li key={p.name} className="person">
              <div className="person-info">
                <span className="person-name">{p.name}</span>
                <span className="person-role">{p.role}</span>
              </div>
              <span className="links">
                <a
                  className="icon-btn"
                  href={p.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${p.name} – LinkedIn`}
                  title="LinkedIn"
                >
                  <IconLinkedIn />
                </a>
                <a
                  className="icon-btn"
                  href={p.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${p.name} – GitHub`}
                  title="GitHub"
                >
                  <IconGitHub />
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
