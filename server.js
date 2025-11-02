replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]); }
    const names = winners.map(w => w.name + ' — ' + w.amount + '₺');
    let t = 0;
    const spin = setInterval(()=>{
      const idx = Math.floor(Math.random()*names.length);
      animBox.textContent = names[idx];
      t += 1;
    }, 90);
    setTimeout(()=>{
      clearInterval(spin);
      animBox.textContent = 'Kazananlar görüntüleniyor...';
      setTimeout(()=>{
        animBox.style.display = 'none';
        reveal();
      }, 600);
    }, 3200 + Math.floor(Math.random()*1200));
  </script>
  `;
  res.send(layout('Çekiliş Sonucu', body));
});

// --- Root ---
app.get('/', (req,res)=> res.redirect('/admin/login'));

// --- Start ---
app.listen(PORT, ()=> console.log('Grand Çekiliş çalışıyor → http://localhost:'+PORT));
