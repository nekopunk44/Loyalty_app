export default function Footer() {
  return (
    <footer
      className="py-10 px-6 mt-auto"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #F7931E)' }}
          >
            <span className="text-white font-bold text-xs">VJ</span>
          </div>
          <span className="text-slate-300 font-semibold">Villa Jaconda</span>
        </div>

        <p className="text-slate-500 text-sm text-center">
          © {new Date().getFullYear()} Villa Jaconda. Все права защищены.
        </p>

        <div className="flex gap-6">
          {['О программе', 'Галерея', 'Контакты'].map(link => (
            <a
              key={link}
              href={`#${link === 'О программе' ? 'loyalty' : link === 'Галерея' ? 'gallery' : 'contact'}`}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
