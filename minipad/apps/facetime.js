/* Call family: big photo buttons that start a FaceTime call. */
MP.define('facetime', {
  mount: function (root, ctx) {
    var people = ctx.get('people', []);
    var editing = false;
    var TINTS = ['#f6c26b', '#8ec5ff', '#f59fc4', '#9ad6a5', '#c7a6f5', '#ffb38a'];

    function clean(addr) {
      addr = String(addr || '').trim();
      if (addr.indexOf('@') > 0) return addr.replace(/\s+/g, '');
      return addr.replace(/[^\d+]/g, '');
    }
    function render() {
      ctx.actions('<button type="button" class="btn small' + (editing ? ' on' : '') + '" data-act="edit">' + (editing ? 'Done' : 'Edit') + '</button>');
      var html = '<div class="wrap">';
      if (!people.length) {
        html += '<div class="card center"><p style="font-size:20px">Add the people you call most. Each one gets a big photo button.</p>' +
          '<button type="button" class="btn primary big" data-act="add">+ Add a person</button></div>';
      } else {
        html += '<div class="ft-grid">' + people.map(function (p, i) {
          var face = p.photo ? '<img src="' + MP.esc(p.photo) + '" alt="">' :
            '<span class="ft-initial" style="background:' + TINTS[i % TINTS.length] + '">' + MP.esc((p.name || '?').charAt(0).toUpperCase()) + '</span>';
          return '<div class="ft-card" data-i="' + i + '">' +
            '<button type="button" class="ft-face" data-act="' + (editing ? 'editp' : 'video') + '">' + face + '</button>' +
            '<div class="ft-name">' + MP.esc(p.name) + '</div>' +
            (editing ? '<button type="button" class="btn small" data-act="editp">Change</button>' :
              '<div class="hstack ft-btns"><button type="button" class="btn primary" data-act="video">📹 Video</button>' +
              '<button type="button" class="btn" data-act="audio">📞 Voice</button></div>') + '</div>';
        }).join('') + (editing ? '<div class="ft-card"><button type="button" class="ft-face ft-add" data-act="add">+</button><div class="ft-name">Add a person</div></div>' : '') + '</div>';
        html += '<p class="muted small center" style="margin-top:20px">FaceTime asks you to confirm before it calls. The person needs an iPhone, iPad or Mac.</p>';
      }
      root.innerHTML = html + '</div>';
    }
    function editPerson(i) {
      var p = i == null ? null : people[i];
      MP.form({
        title: p ? 'Change ' + p.name : 'Add a person',
        del: !!p,
        fields: [
          { name: 'name', label: 'Name', value: p ? p.name : '', required: true, placeholder: 'For example: Grandma' },
          { name: 'addr', label: 'Phone number or Apple ID email', value: p ? p.addr : '', required: true, autocap: false, hint: 'The number or email they use for FaceTime.' },
          { name: 'photo', label: 'Photo', type: 'image', value: p ? p.photo : '' }
        ]
      }).then(function (v) {
        if (!v) return;
        if (v === 'delete') {
          MP.confirm('Remove ' + p.name + '?', 'Remove', true).then(function (ok) {
            if (ok) { people.splice(i, 1); ctx.set('people', people); render(); }
          });
          return;
        }
        var np = { name: v.name, addr: clean(v.addr), photo: v.photo || '' };
        if (p) people[i] = np; else people.push(np);
        if (!ctx.set('people', people)) { people = ctx.get('people', []); }
        render();
      });
    }

    ctx.delegate(root, 'click', '[data-act]', function (e, el) {
      var act = el.getAttribute('data-act');
      var card = el.closest('[data-i]');
      var i = card ? +card.getAttribute('data-i') : null;
      if (act === 'add') editPerson(null);
      if (act === 'editp') editPerson(i);
      if ((act === 'video' || act === 'audio') && i != null) {
        var p = people[i];
        if (!p.addr) { MP.toast('Add a phone number or email first.'); return; }
        window.location.href = (act === 'video' ? 'facetime://' : 'facetime-audio://') + p.addr;
      }
    });
    ctx.delegate(ctx.bar, 'click', '[data-act="edit"]', function () { editing = !editing; render(); });
    render();
  }
});
