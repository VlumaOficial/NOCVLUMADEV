export default function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 pb-4 text-center">
      <div className="flex items-center justify-center space-x-2 text-noc-muted text-sm">
        <img
          src="/logo.png"
          alt="VLUMA"
          width={24}
          height={24}
          style={{ objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <span>Designed & Developed by </span>
        <a
          href="https://www.vluma.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold bg-gradient-to-r from-noc-primary to-noc-accent bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          VLUMA
        </a>
      </div>
    </footer>
  )
}
