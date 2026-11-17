const INSTAGRAM_URL =
  "https://www.instagram.com/st.shmidt?mdxt=emx1MzR3dmN0MmZx&utm_source=qr";

export function BrandFooter() {
  return (
    <footer className="health-brand-footer mt-10 pb-6 pt-4">
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="health-brand-footer-link"
        aria-label="Instagram: instagram.com/st.shmidt"
      >
        <img
          src="/brand/logo-shmidt.png"
          alt=""
          className="health-brand-logo"
          width={120}
          height={40}
        />
        <span className="health-brand-link text-footnote">instagram.com/st.shmidt</span>
      </a>
    </footer>
  );
}