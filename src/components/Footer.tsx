export default function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 pb-4 text-center">
      <a
        href="https://www.vluma.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center space-x-2 text-noc-muted text-sm hover:opacity-80 transition-opacity"
      >
        <img
          src="/logo.png"
          alt="VLUMA"
          width={24}
          height={24}
          style={{ objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <span>Designed & Developed by </span>
        <span className="font-semibold bg-gradient-to-r from-noc-primary to-noc-accent bg-clip-text text-transparent">
          VLUMA
        </span>
      </a>
    </footer>
  )
}
