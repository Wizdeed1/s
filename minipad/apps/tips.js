/* iPad tips: step-by-step help for an iPad mini 2 on iOS 12.5.8. */
MP.define('tips', {
  mount: function (root) {
    var TIPS = [
      {
        icon: '🖼️', title: 'Use the iPad as a wall or kitchen display',
        body: [
          'Plug the iPad in, then go to <b>Settings › Display &amp; Brightness › Auto-Lock</b> and choose <b>Never</b>.',
          'Open MiniPad\'s <b>Dashboard</b> or <b>Night clock</b>.',
          'To stop anyone leaving MiniPad, turn on <b>Guided Access</b> (see below) and start it while the dashboard is open.',
          'Set Auto-Lock back to a few minutes when you take the iPad off the wall, or the battery will run down quickly.'
        ]
      },
      {
        icon: '📲', title: 'Install apps that say they need a newer iOS',
        body: [
          'On a newer iPhone or iPad (or a Mac), signed in with the <b>same Apple ID</b>, download the app once.',
          'On this iPad, open the <b>App Store</b>, tap your picture at the top right, then <b>Purchased</b> › <b>My Purchases</b> › <b>Not on this iPad</b>.',
          'Tap the cloud button next to the app. When it asks <b>"Download an older version of this app?"</b>, tap <b>Download</b>.',
          'Apps that work offline usually keep working. Apps that need their company\'s servers (video, banking, messaging) often refuse old versions.'
        ]
      },
      {
        icon: '🧒', title: 'Screen Time for children',
        body: [
          'Go to <b>Settings › Screen Time</b> and tap <b>Turn On Screen Time</b>, then <b>Continue</b>, then <b>This is My Child\'s iPad</b>.',
          '<b>Downtime</b> blocks apps at night. <b>App Limits</b> sets daily minutes for games or videos.',
          '<b>Content &amp; Privacy Restrictions</b> can block adult websites, purchases and app deletion.',
          'Choose a <b>Screen Time passcode</b> that the children do not know.'
        ]
      },
      {
        icon: '🔒', title: 'Lock the iPad to one app (Guided Access)',
        body: [
          'Go to <b>Settings › General › Accessibility › Guided Access</b> and turn it on.',
          'Tap <b>Passcode Settings › Set Guided Access Passcode</b>.',
          'Open the app you want (for example MiniPad), <b>triple-click the Home button</b> and tap <b>Start</b>.',
          'To leave, triple-click the Home button again, type the passcode and tap <b>End</b>.'
        ]
      },
      {
        icon: '🧹', title: 'Free up space',
        body: [
          'Go to <b>Settings › General › iPad Storage</b> to see what takes the most room.',
          'Turn on <b>Offload Unused Apps</b>: apps you do not use are removed, but their data stays.',
          'In <b>Photos › Albums › Recently Deleted</b>, tap <b>Select › Delete All</b> to really free the space.',
          'Keep at least 2 GB free. The iPad gets slow when it is almost full.'
        ]
      },
      {
        icon: '⚡', title: 'Make it feel faster',
        body: [
          '<b>Settings › General › Accessibility › Reduce Motion</b>: turn it on.',
          '<b>Settings › General › Accessibility › Increase Contrast › Reduce Transparency</b>: turn it on.',
          '<b>Settings › General › Background App Refresh</b>: turn it off, or leave only the apps you need.',
          'Close Safari tabs you no longer need, and restart the iPad once a week (hold the top button, then slide to power off).'
        ]
      },
      {
        icon: '🔇', title: 'No sound in MiniPad?',
        body: [
          'Check the switch on the side of the iPad. In <b>Settings › General › Use Side Switch To</b> it can be set to <b>Mute</b>.',
          'Swipe down from the <b>top-right corner</b> to open Control Center and check the bell (mute) button.',
          'Press the volume-up button on the side.',
          'Sounds start after the first tap on the screen; that is how iOS works.'
        ]
      },
      {
        icon: '🎙️', title: 'Talk instead of typing',
        body: [
          'Go to <b>Settings › General › Keyboard</b> and turn on <b>Enable Dictation</b>.',
          'Whenever the keyboard is open, tap the <b>microphone key</b> next to the space bar and speak.',
          'This works in Ask Claude, the Notebook, recipes and anywhere else you type.'
        ]
      },
      {
        icon: '💾', title: 'Keep your MiniPad data safe',
        body: [
          'MiniPad keeps everything on this iPad. Nothing is sent anywhere unless you use Ask Claude, family sync or online backup.',
          '<b>Removing the MiniPad icon deletes its data.</b> Make a backup first in MiniPad › <b>Settings › Back up and restore</b>.',
          'Clearing Safari\'s history and website data can also remove it, so back up before you do that.'
        ]
      },
      {
        icon: '✅', title: 'Software updates',
        body: [
          'This iPad is on <b>iOS 12.5.8</b>, the newest version it can run. It renews the certificate that iMessage, FaceTime and activation need after January 2027.',
          'Check now and then in <b>Settings › General › Software Update</b> in case Apple releases another fix.'
        ]
      },
      {
        icon: '🛠️', title: 'Jailbreaking (for tinkerers)',
        body: [
          'A jailbreak lets you install tweaks and apps Apple does not allow. It is at your own risk and can make the iPad unstable.',
          '<b>Chimera</b> supports this iPad on iOS 12.5.8. You need a computer and an Apple ID to install it, and you run it again after every restart.',
          'Follow the guide at <a href="https://ios.cfw.guide/installing-chimera/" target="_blank" rel="noopener">ios.cfw.guide › Installing Chimera</a> exactly. It names a specific build for A7 iPads like this one.',
          'Never use "online jailbreak" sites that ask you to install a profile, fill in surveys or pay. They are not real jailbreaks.',
          'Back up first. To undo it, restore iOS 12.5.8 from a computer (Finder or iTunes); Apple still signs that version.'
        ]
      }
    ];

    root.innerHTML = '<div class="wrap tips">' + TIPS.map(function (t, i) {
      return '<details class="tip card"' + (i === 0 ? ' open' : '') + '><summary><span class="tip-icon">' + t.icon + '</span>' +
        '<span class="tip-title">' + MP.esc(t.title) + '</span></summary><ol class="steps">' +
        t.body.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ol></details>';
    }).join('') + '</div>';
  }
});
