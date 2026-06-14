(function () {
  // Determine if the current page is a tool page (inside /tools/) to resolve the root relative path.
  // This is highly robust compared to counting path segments since it works on domain roots,
  // subdirectory roots (e.g. /hako/ on GitHub Pages), and local file systems.
  const isToolPage = location.pathname.includes('/tools/');
  const root = isToolPage ? '../../' : './';

  // Inject common header
  const header = document.getElementById('layout-header');
  if (header) {
    // Determine back link visibility. If on the home page, we don't need a back link.
    const backLinkHTML = isToolPage 
      ? `<a class="back-link" href="${root}index.html">← ツール一覧</a>`
      : '';

    header.innerHTML = `
      <header class="site-header">
        <a class="site-title" href="${root}index.html">hako</a>
        ${backLinkHTML}
      </header>
    `;
  }

  // Inject common footer
  const footer = document.getElementById('layout-footer');
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <p>すべての処理はブラウザ内で完結します。入力データは外部に送信されません。</p>
        <p style="margin-top: var(--space-2); font-size: var(--text-sm); opacity: 0.8;">
          免責事項: 本ツールの利用により生じた損害や不利益等について、開発者は一切の責任を負いません。
        </p>
      </footer>
    `;
  }

  // Inject toast container dynamically if not present
  document.addEventListener('DOMContentLoaded', () => {
    let toast = document.getElementById('toast-element');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-element';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
  });

  // Global helper function to show toast messages
  window.showToast = function (message) {
    const toast = document.getElementById('toast-element');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      // Clear any existing timeout on the element to avoid overlapping transitions
      if (toast._timeoutId) {
        clearTimeout(toast._timeoutId);
      }
      
      toast._timeoutId = setTimeout(() => {
        toast.classList.remove('show');
        toast._timeoutId = null;
      }, 2000);
    }
  };
})();
