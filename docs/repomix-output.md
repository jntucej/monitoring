This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
FIX/
  admin.excalidraw
  CONTEXT_TEMPLATE.md
  page_fix_IMPROVED.md
  page_fix.txt
  ROLL_NUMBER_SEMANTICS.md
  SEMANTICS_GATE_MONITOR.md
  supervisor.excalidraw
  ui.excalidraw
gate/
  Gate_Monitoring_Master_Prompt.md
gate-monitor/
  .git/
    gk/
      config
    hooks/
      applypatch-msg.sample
      commit-msg.sample
      fsmonitor-watchman.sample
      post-update.sample
      pre-applypatch.sample
      pre-commit.sample
      pre-merge-commit.sample
      pre-push.sample
      pre-rebase.sample
      pre-receive.sample
      prepare-commit-msg.sample
      push-to-checkout.sample
      sendemail-validate.sample
      update.sample
    info/
      exclude
      refs
    logs/
      refs/
        heads/
          main
        remotes/
          origin/
            main
      HEAD
    objects/
      00/
        fc5e5a7fab9f21e6c72d6be61eb2a9276bc608
      01/
        5f0cebcf32b254ae0f3714239464b272fd079a
      03/
        22678cf62a0a839fa0a8a57bdf341a37e9b69e
      04/
        15ca5f001ce2a5926d37f1a0a0ee618a6de0bb
      05/
        45a1f2a4169b5476524f62149f6e29980288dc
      06/
        431b1d94afd2166f2f21b9d9bb7f5148539bce
      09/
        1284a4df86cb264d76a5b692b2761317819051
      0b/
        1867d0090d7ef9cf3c971648af05aec3ad9556
        af353ca44598d2560b82627d730ed8d1704108
      0d/
        0eed931085b13c0fcc1c937b45d92a558cd2d0
        371b6d1c692aedde0939a5adf9ef941d770a12
      11/
        21871f2148939a0aa95cea05afe26ec0f8d2d3
      12/
        05f1189e74500f4466add4fdbc2ac81168b97e
        0ba56d528101375c63c67800f214d8ca76108b
        73b4d8ae046419d3ab8583e05f8ab0bde718bc
        d604281a9f925bded7688ecee460cb1be632b0
      13/
        1d3dc997eb80abe44270c8095fff30977d2a85
        3e469cff83683400f4d7a6f57778c65bfc9323
      16/
        01addf87bdc9ed286829c6cf033867a1e39035
      17/
        d67edcf5a569a66a1bb89f74cf5c170474fecb
      19/
        4a82dd79aa9a7b67186177777b9ffb3bf88ba0
        febb1a741a6d5689b8663b1cc86bf870523f7f
      1a/
        4964ce60161aa991a63b3af9a9dc59db047b04
      1b/
        02e5d04ecd9bde181a8c4ab1533342c3f7e3c0
        336830eab477e3f5a6ea84c57943de026802c9
        a10003a78e536911156cf8dca6b845e128e4a0
      1d/
        747f9f99372987b0d76ae4f2332b62cee18839
      1e/
        4fb812c7234726b48f7c5082b4df5648a70c05
      1f/
        199a3c2bc051c21af77d884b55b912b9f4866a
      20/
        4623a4a504d9d1bcdca9c8cd140cae14a4bcdc
      21/
        0fcd78a125c6ec8008f7f7afdc84904ce3744a
      23/
        53a49e61bc803002c3ce03e79b4ad882545214
        a1a13d2e08f8cbed4923fd32c93afdda50da8b
      24/
        3937254bac2103536310fb7ef4b7547052c65e
      27/
        c59905127278bdc68cf39533d8b259a96de289
      28/
        f50098fab5419bed15b1a54ea21130e8f73e43
      2a/
        8d1a65de4cee399ead4b182ececbc0371a89da
      2d/
        083e2bf1139854e61ef9b635aa19bd5a196c38
      30/
        18bea0c2c8b749c3f4e1032f4f2455287f38f1
        80377cf6b9250214a3db7671982462b3b1d73f
      32/
        85221adccfe900beaf3888ffb6b6f2ff61f65d
      34/
        0bbb344bc33f5437adc5247950331bb80a9bae
        e235331ebc9d620bce79295f068a8ebb53f4b3
      35/
        0a8c9d1661e0e2cc7cf889a2557a6176c28217
      37/
        eb43deb5e386d0c4c64384c7e2346fd5b2e6be
      39/
        bc112a1eec5af25b5079ecd8843014f799c4e4
      3f/
        d4d284cfac89793f9b2cc66d18fd115b5e90d7
      41/
        27252d83b957d93b32aa11f7fd0a9fcd0c8bc6
        61f816e32a5115ee3c72331839f6eefab8da64
      43/
        e7e693ba0eb0cf35dd128a3a9b7286981ada92
      44/
        ce42695649e4b3cc1894c78af1f33b611c4e9f
      45/
        93eed7a15327986f666d04fb58db71c4ba628f
      46/
        e058440fa99e7e1376c6ecac6c10f6f9243ca5
      47/
        f7e2094e961b6f5c585628825842ed945b9bdc
      48/
        38343079d27bbe128cfc14c18412feac7b03c7
        d8714af082acd5551cc55b591ab3b9508ba82c
      49/
        7076d21efcb65f95e0961bea2c6ec130245dad
      4b/
        0800d39d1c54c5e7e37237e21ca4bde6e51129
        0b99ca1aef9c65765aec9c3836085c6c019c56
      4c/
        6532c8849a73c20eb84e435bd28470ed0cd52f
      4d/
        2b5eabbf86d0c11cd2483b4a4c33abc92d8d26
      51/
        5582b4869e760a2e791bba7db7c94dc106b00b
      58/
        1d477f23b72b03f7e74f77dd92e9f34e00f287
      5a/
        274de5ec02034135049c3dcdb7344ca96681ec
      5c/
        80b29c11f2f1e15919179b1553a7fb294676bb
      5f/
        731698bdea73535d0ead63073320944ca3585a
        942a9070d9d0d7f1c0a1f5b094877e0fe9422a
        cc80a1d8f13f1e6160bc0b5fde1d077ed5fb5a
      60/
        1b58e995f029dcfe7962c00fb5c44bc730566f
      65/
        c9c63774788eb20e7429c142f8585c88da7648
      68/
        cc9c75c7753564e43b1f119f2dbe1f04195f43
      6a/
        ad84914fbbc1aafbcba2c87abfa2bb4933bb3c
      71/
        0e5f9a31caa23f42adcc652921f5d07a6a94c4
        ee4c3b2966bfc7d2214d74a0c4a5170c0ec62b
      74/
        2e096751cbe7492c1b4bccc1fd7a832167b8e1
        6863d36c9420ae3da882445bc3f5d041513b2a
        df223c105dbb0996b3a7a4505926308d6a7de3
      77/
        e8af0a00d20d5e2c0f2943ee0584a19d142b40
        ff4ac1fdc2e2f6eb31e128ee1e7201bf352ad3
      7a/
        15b59c2dbf7aceef98036bdfe719f2c44b7555
      7b/
        304ac3a84973fd3cb9fba5afebe63f1c6ca851
      7d/
        07571ed6ef4159613858687f136e379b00f868
        1eb3905bc9476496f531c4ec22db7189322c8b
        43dac57900979546d4177e23964c75b8608004
      7e/
        234a221b3076bfb1e309910da60ce6d603aace
        fd4ff9fe967b69f6ce936390b2d7bbff4d1b61
      7f/
        97c02d046aaf618b85a89a5d1205f2fba77cdf
      80/
        26f5089fe509f329dc3560b358f70212f5191c
        82fd861d7566c52f1d1bd0acb8bb9694054fd4
        ee3788b54621050d3dae6914f7994107577b55
      81/
        b9d64f0350dc24acdd25461f8a359aba91f02d
      83/
        3118b8d54597518b046f2093481d402614db44
        64bcd8550f036b5067bdac1f8f9f6110f05b25
      85/
        69d9f825a92d0d5a3917c4a338415609ab73d3
      86/
        081d9c291e9de349c56bb70b9b94ecb3507a30
        2a5e0c1c53e0ced3ec393d2def396585c704dc
      89/
        57f8457e66eaaad39ad4df73aa012415c96cb7
      8c/
        aa85eac9750b54450f2d04137a0f1c74e70cb1
      8d/
        d424fdb6e46f99d9b50e4dcf44e35b379cc14f
      8e/
        98caa73e21cc6a1fa07eaccb8f0a986769e6e2
        da856d23c649358cecd6f766b694c1eaab3c0d
      8f/
        2e87049b3283ced8265a0ad9fea5fbebbfe117
      91/
        553d32d7a6a83295fc06046adc15571041cc33
        b8742c1ed7362959705a07e36d747d6e5724d2
      96/
        b19c407489dfb0dcb81a4f9f68f73fe7c29351
      97/
        537abd5e1b778969e300e4db998bedd16fcbc3
        77ccbb072573c3d4bef9d004c7e0170048a7bd
        87e2e903a933c9aa981b9ae7ab3dfd8c6c3eb8
        d66fc216c3d5ddf7e1bb17663c32cce600f98c
      98/
        2f196b0a891d52c6372269471f649cb23f0485
      99/
        33332a59135d19de6620d2e5c6b241e37e165d
        4cb82c0f024aa99d322d74a86b6c17514f11ee
        97ff1e07ba0d092518863c63bd129677c754e4
      9a/
        3df8ac594db084a3ca8503b18b44da15fc1000
        52a30ba3789bbed9eef63dd9576b3047438a62
      9c/
        26235c7c884d03fe38384e0b09e8925631c82d
      9e/
        087e5ebe6390f40abdfe38e3f703c034a8f163
      9f/
        a7e546b24a9b88f03e61027b40484e12268d50
      a0/
        003f00ffceafc18c3a1078352969b88728c7b7
        666adb14861b261adb0dc4a53771bf69e7e853
      a1/
        8a54f261c03f97d6ac57a3f5104535d6f4bfa5
        a89e8da0934a1ae0221e01ef84f98687488ea6
      a2/
        e1d9f9c7155783a351de6fe5509710c273e4a1
      a4/
        e194f03280627c8a8653a20a577eebc5dda201
      a5/
        9fcdafb6bd042bf5d2f9d1c566ebdb68cb168d
        b5b7ff8a453f5fa761bcbd00cd97192978beb3
      a8/
        56773fad0eb02d5d9d74cced3359b161622d1e
      a9/
        fc58cf621ea17abe19fa35f0ded9ac5cf5d04f
      aa/
        e5fd818a623a4433f44c19d4b16f6a5a4efdde
      ac/
        2e66ecc802c0d5ee5c743f824300add67c33c9
        8f97689713fd4ab8ec972764fd7aae6b74805e
      ad/
        8fe02f69eb1bb3c6fd294027f2f85e251fdd8a
      af/
        7be6275fa3d8dc3008b7848c7c3399f2854396
        e7b3b03039808cd63ed4b323ebb56a12444aa7
      b0/
        112cde27bf90eee52f280aec6f5130b766db57
        1e2b6677322a00223502db16f36e9f4f14c5e9
        313d30e498f7360619ce137aaea9f574cdf3cf
      b1/
        5a37a52b8d79433017db8ed926eb3492e79cdc
      b2/
        22c055ffd4577d32e12fbaff064870620d5a7b
      b3/
        481456e5c9389e3894831b358adcdf1e288861
        c3d8653e2ce487e02fa6700b314de072cbe58c
      b4/
        83eb359830ee01bc90fcd4495f4ecb1dba8234
      b6/
        f4f584303685ca39c3ff590f57e484354c3971
      b8/
        22245d5603fda1c350cf149d385a97379afde2
        fd3cc68a3d35782be5e6e1201d3bddab41e0dd
      ba/
        07820ab843c8e9fdb7f023853dfbeca585522a
      bc/
        ab23fbf8330a176b03d57651553c92c5005689
      c0/
        b2e8d997ec4d7fb170b50ebbf968eab5045d76
      c2/
        8eaaae42ddfa6f3cff1a860c8739f7984383cd
      c3/
        c9350b08a61782a54355a6ae3e14ff9dce742c
      c5/
        0abfc010973c1f947036cd21400b457a708e4b
        f6fe4c9a063dc41973a838a0991b231e52f60e
      c6/
        c24ee74e6918858427bc34b23b41eff42e2335
      c7/
        63be6f07a5cb24efddc5a91f9aa1cf94b5e2af
      c8/
        b4728ae28e007f831a25dc4a2d3416ce1c028a
      c9/
        ad0e26bc81db708229fc623b5f39eb97a69e27
      ca/
        8e2291136fd8ac42d340bdba5e2a16cbcf562c
        e502357f756df923123986ff8d47b38c217dad
      cb/
        4e645b40df105df68dca865a4fb41dff06d414
      ce/
        c90cf9cb158ff4e1378eee2f12f2b54208ad68
      cf/
        5bb21d6f3b5e619c67bcb77f6bd4b8a8f18e92
        6db0e87076ff3d321fbe1d76d3f494ff440a6d
        994513a5847d3b951e7d856ff050cb0abb1cdc
      d0/
        f3f17b15b4967258f0d267d04cb54ad5513072
      d6/
        c3f7597581875198427cc67511261e8275faf9
      dc/
        44ca6ba96c641f77331b107e6bf63d619e7d25
        ba90388077097fbd3879d76f3132a96501697b
      de/
        145e1261d09b42dcabe58f21c6b20db98cb93e
        846db2e0ec0a036a025f6fbf9f39b0094d478e
      e5/
        5f84889138d7ed008900c7a22017696b9e2a2e
        dbdeb075c2081fabfc0042520b83f532162577
      e8/
        40a8a67f3d594f254e5ebc2a8071427bf4a781
      eb/
        0b2223b246c0155d64f8cf076dbfe1b7fe3f2e
      ed/
        01bb5078d06f391896028abcd551e83884f735
      ee/
        53330a53d96a7dd6f8edd5189a061bbd73f5cb
      ef/
        385592d2a1e3219187830428de77e01cc82e04
        785796f221960389946faa5d63802250896dbf
        95de4d5e8ae019015b8550cefebac96abf718b
        d0a3bef18197e0b2641229f5a555c9f8e51b4a
      f0/
        7d7fa2991a50f41f02ab2bf46eb6c99b7b41d0
      f2/
        26a1972e89e666b1d57bb1be4613d70c5ea2c8
      f6/
        fff277d2dce2af1a46a0b777ced25b91db20ce
      f7/
        489f2803f38c788d90ba293f0f080c26b81ff5
        b15ed80e9b440f3d8e0f4b6408815c313a9a03
      f9/
        d0f65121bebb9189c9a047e33f600ca068c484
      fa/
        29b73ea470e781722796f32b711dc76b48069b
        2db5734b4b9cedb79afccf4ef46e3e133bfe61
      fc/
        28559a36d97a37b986977e82ad1d39da713f84
      fd/
        07571eef23ed2ef2351a3c3d4f75ca30b9b810
      info/
        commit-graph
        packs
      pack/
        pack-15a311a139a4457c604bb5dd88a6f8fb0bb0cfe8.idx
        pack-15a311a139a4457c604bb5dd88a6f8fb0bb0cfe8.pack
        pack-15a311a139a4457c604bb5dd88a6f8fb0bb0cfe8.rev
    refs/
      heads/
        main
      remotes/
        origin/
          main
    COMMIT_EDITMSG
    config
    description
    FETCH_HEAD
    HEAD
    index
    ORIG_HEAD
  public/
    avatar-placeholder.png
    file.svg
    globe.svg
    next.svg
    vercel.svg
    window.svg
  src/
    app/
      (admin)/
        admin/
          alerts/
            page.tsx
          attendance/
            page.tsx
          dashboard/
            page.tsx
          reports/
            page.tsx
          settings/
            page.tsx
          students/
            page.tsx
          page.tsx
        layout.tsx
      (operator)/
        gate/
          [gateId]/
            page.tsx
        layout.tsx
      (parent)/
        parent/
          child/
            page.tsx
          passes/
            page.tsx
          settings/
            page.tsx
          page.tsx
        layout.tsx
      (student)/
        student/
          history/
            page.tsx
          id/
            page.tsx
          passes/
            page.tsx
          page.tsx
        layout.tsx
      (sysadmin)/
        sysadmin/
          page.tsx
        layout.tsx
      api/
        admin/
          dashboard/
            route.ts
        alerts/
          route.ts
        auth/
          login/
            route.ts
          logout/
            route.ts
          pin-login/
            route.ts
          session/
            route.ts
        gate/
          logs/
            route.ts
          scan/
            route.ts
        notifications/
          route.ts
        passes/
          [passId]/
            route.ts
          route.ts
        students/
          [roll]/
            route.ts
          route.ts
        supervisor/
          corrections/
            route.ts
          live-events/
            route.ts
      login/
        layout.tsx
        page.tsx
      supervisor/
        corrections/
          page.tsx
        live/
          page.tsx
        layout.tsx
      favicon.ico
      globals.css
      layout.tsx
      page.tsx
    components/
      admin/
        EntryExitChart.tsx
        StatCard.tsx
        StudentList.tsx
      operator/
        ExitReasonSelector.tsx
        LastScanCard.tsx
        ManualEntryDialog.tsx
        OperatorStats.tsx
        RecentScans.tsx
        ScanConfirmation.tsx
        Scanner.tsx
        ScanViewfinder.tsx
        SuccessFlash.tsx
      parent/
        ChildActivity.tsx
        ChildStatus.tsx
        RequestPassForm.tsx
      shared/
        Header.tsx
        Sidebar.tsx
        StatusBadge.tsx
      student/
        ActivePasses.tsx
        DigitalIdCard.tsx
        RecentActivity.tsx
      supervisor/
        CorrectionsList.tsx
        LiveFeed.tsx
      sysadmin/
        GateManagement.tsx
        SystemSettings.tsx
        UserManagement.tsx
      ui/
        badge.tsx
        button.tsx
        card.tsx
        input.tsx
        modal.tsx
        select.tsx
        skeleton.tsx
        table.tsx
        tabs.tsx
        toast.tsx
    hooks/
      useApi.ts
      useAuth.ts
    lib/
      auth.ts
      db.ts
      rollNumber.ts
      supabaseClient.ts
      types.ts
      utils.ts
    stores/
      adminStore.ts
      authStore.ts
      operatorStore.ts
      uiStore.ts
  .gitignore
  AGENTS.md
  CLAUDE.md
  eslint.config.mjs
  fix_types.py
  next.config.ts
  package.json
  postcss.config.mjs
  README.md
  tsconfig.json
Plan/
  Gate_Monitoring_BACKEND_Architecture.md
  UI_Plan_Gate_Monitoring_System.md
.repomixignore
package.json
repomix.config.json
````

# Files

## File: FIX/admin.excalidraw
````
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor",
  "elements": [
    {
      "id": "-usxkdrzrBpfNATTRUQ4G",
      "type": "rectangle",
      "x": 1195.7911910964713,
      "y": -878.8622225270059,
      "width": 950.92809668366,
      "height": 1267.8501378170993,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a0",
      "roundness": {
        "type": 3
      },
      "seed": 1468836184,
      "version": 352,
      "versionNonce": 2073483048,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786869192526,
      "link": null,
      "locked": false
    },
    {
      "id": "mfXgRiZHWnuvfBBjXoOnP",
      "type": "text",
      "x": 1611.1333141345144,
      "y": -938.826437002275,
      "width": 112.37991333007812,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a1",
      "roundness": null,
      "seed": 2107550248,
      "version": 155,
      "versionNonce": 1677832744,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786869192526,
      "link": null,
      "locked": false,
      "text": "admin page ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "admin page ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "BaUamu40NYcbxAaQiO_nY",
      "type": "text",
      "x": 2537.8184749096195,
      "y": -871.3762963692359,
      "width": 76.0619215333354,
      "height": 32.54961647725512,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a2",
      "roundness": null,
      "seed": 761722968,
      "version": 126,
      "versionNonce": 49210340,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786870453476,
      "link": null,
      "locked": false,
      "text": "tools ",
      "fontSize": 26.0396931818041,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "tools ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "oEcUUagmN-pcjgjfK8Iua",
      "type": "text",
      "x": 2478.3806220354804,
      "y": -783.6621927763422,
      "width": 763.3395385742188,
      "height": 150,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a3",
      "roundness": null,
      "seed": 644057944,
      "version": 538,
      "versionNonce": 1675395428,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786871368970,
      "link": null,
      "locked": false,
      "text": "1. all the acess of that gate supervisor had\n2. and current classes working and any severe \n3. any imporper things that are hapening at gate level like\nsupervisor maul push \n4. able to see ever detail cleraly not only just  parametrs \n5.admin have the add new acess to new candidates below  add that tool too ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "1. all the acess of that gate supervisor had\n2. and current classes working and any severe \n3. any imporper things that are hapening at gate level like\nsupervisor maul push \n4. able to see ever detail cleraly not only just  parametrs \n5.admin have the add new acess to new candidates below  add that tool too ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "_CFDRlPr7PymaPOuTwg3G",
      "type": "text",
      "x": 2383.3172324380234,
      "y": -458.040780276633,
      "width": 700.0995483398438,
      "height": 150,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a4",
      "roundness": null,
      "seed": 1708454620,
      "version": 373,
      "versionNonce": 183230948,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786871400344,
      "link": null,
      "locked": false,
      "text": "improvements :\n1. we need to get access direct form databasse we are going to use it \nno fake data and that stuff \n2. before accessing this page  eveyone should get login ihth credeitos\n3.interactive elements for minimal approach \n",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "improvements :\n1. we need to get access direct form databasse we are going to use it \nno fake data and that stuff \n2. before accessing this page  eveyone should get login ihth credeitos\n3.interactive elements for minimal approach \n",
      "autoResize": true,
      "lineHeight": 1.25
    }
  ],
  "appState": {
    "gridSize": 20,
    "gridStep": 5,
    "gridModeEnabled": false,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
````

## File: FIX/CONTEXT_TEMPLATE.md
````markdown
# 📋 AI Context Template — Copy this for every new task

> Fill this out before asking AI to work on anything. The more structured this is, the better the AI output.

---

## 1. TASK OVERVIEW

```markdown
# Task Title: [Short, clear name]

## Goal (one sentence)
[What do you want the end result to be?]

## Priority
[ ] 🔴 Critical — Security / Data loss / Broken
[ ] 🟡 High — Blocks other work
[ ] 🟢 Medium — Improvement
[ ] ⚪ Low — Nice to have

## Deadline / Urgency
[When does this need to be done?]
```

---

## 2. CURRENT STATE (What exists now)

```markdown
## Current Behavior
[Describe exactly what happens today. Include URLs.]

## Current Files (if known)
- `src/app/page.tsx` — Home page
- `src/app/(operator)/gate/[gateId]/page.tsx` — Gate operator

## Screenshots of current state
[Paste screenshots here — AI can see images!]
```

> 💡 **Tip:** Screenshots are worth 1000 words. Always include "before" screenshots.

---

## 3. DESIRED STATE (What you want)

```markdown
## Desired Behavior
[Describe exactly what should happen. Step by step.]

## Visual Reference
[Paste screenshots / Excalidraw / Figma links here]

## Interaction Flow (step by step)
1. User opens [URL] → sees [X]
2. User clicks [button] → [Y happens]
3. If [condition] → show [Z]
```

> 💡 **Tip:** Write it like a user story:
> "As a **Gate Supervisor**, I want to **see live entry/exit events**, so that **I can monitor campus activity in real-time**."

---

## 4. REQUIREMENTS (Checklist format)

```markdown
## Functional Requirements
- [ ] [Requirement 1 — e.g., "Login page with username + password"]
- [ ] [Requirement 2 — e.g., "Session persists after refresh"]
- [ ] [Requirement 3 — e.g., "Role-based redirect"]

## Non-Functional Requirements
- [ ] Performance: [e.g., "Page loads < 2s"]
- [ ] Security: [e.g., "No direct access without auth"]
- [ ] Design: [e.g., "Dark theme, Inter font, glow effects"]
- [ ] Responsive: [e.g., "Works on tablet + desktop"]
```

> 💡 **Tip:** Use checkboxes. AI can track them and verify completion.

---

## 5. DESIGN SPEC (Colors, Layout, Style)

```markdown
## Design System
- Font: [e.g., Inter]
- Colors: [e.g., Dark bg #0F172A, Primary #10B981, Danger #EF4444]
- Border radius: [e.g., 12px cards]
- Spacing: [e.g., 4/8/12/16/24/32]

## Layout (ASCII or Excalidraw)
[Draw a simple ASCII wireframe or reference an Excalidraw file]

┌─────────────────────────────────────┐
│  Header: Logo | Title | User       │
├──────────┬──────────────────────────┤
│ Sidebar  │  Main Content            │
│ - Live   │  [KPI cards]             │
│ - Logs   │  [Table / Feed]          │
│ - Corrections │                     │
└──────────┴──────────────────────────┘
```

---

## 6. DATA & API (If relevant)

```markdown
## Data Model
| Field | Type | Example |
|-------|------|---------|
| rollNumber | string | 21CSE045 |
| eventType | enum | entry / exit |
| timestamp | datetime | 2026-08-16T09:12:43Z |

## API Endpoints (if known)
- `GET /api/supervisor/live-events` → returns live events
- `POST /api/auth/login` → returns token

## Mock Data / Sample Data
[Provide sample data so AI can build realistic UI]
```

---

## 7. ACCEPTANCE CRITERIA (How to know it's done)

```markdown
## Done When:
- [ ] [e.g., "Visiting /gate without login redirects to /login"]
- [ ] [e.g., "After login, refreshing the page keeps me logged in"]
- [ ] [e.g., "Supervisor dashboard shows KPI cards that drill down"]
- [ ] [e.g., "All buttons have hover/active states"]
- [ ] [e.g., "No console errors"]
```

> 💡 **Tip:** This is the MOST important section. AI verifies against this before saying "done".

---

## 8. CONSTRAINTS & AVOID

```markdown
## Do NOT:
- [ ] Don't change the database schema
- [ ] Don't add new dependencies unless necessary
- [ ] Don't break existing pages
- [ ] Don't use placeholder text — use real college data

## Must Use:
- [ ] Existing component library (shadcn/ui)
- [ ] Existing stores (Zustand)
- [ ] Existing API routes
```

---

## 9. REFERENCE FILES

```markdown
## Files AI should read first
- `gate/Gate_Monitoring_Master_Prompt.md` — Master spec
- `FIX/supervisor.excalidraw` — Supervisor dashboard design
- `gate-monitor/src/lib/types.ts` — Type definitions

## Related docs / links
- [College website](https://jntuhcej.ac.in/)
- [Design reference](https://example.com)
```

---

## ⚡ QUICK TIPS SUMMARY

| ❌ Weak Context | ✅ Strong Context |
|---|---|
| "Make it look better" | "Add subtle glow on hover + 0.5s fade-in animation on cards" |
| "Add login" | "Add login at /gate — username+password, persist session in localStorage, redirect unauthenticated users to /login" |
| "Fix the dashboard" | "Redesign /supervisor per FIX/supervisor.excalidraw — KPI cards (Day Scholars, Day Out, Total Strength) that drill down into categorized lists" |
| "Make it interactive" | "Clicking KPI card 'Day Scholars' expands a panel below showing boys/girls counts, faculty, visitors — with filter chips" |
| No screenshots | Include before/after screenshots |
| No acceptance criteria | "Done when: unauthenticated /gate redirects to /login" |
| Vague priority | "🔴 Critical — security issue, fix first" |

---

## 🎯 THE GOLDEN RULE

> **Give AI the same context you'd give a new developer joining your team.**
> If a new dev would be confused, AI will be too.
> Structure > Length. Specific > Vague. Visual > Text.
````

## File: FIX/page_fix_IMPROVED.md
````markdown
# 🔧 Page Fix Requests — Improved Version

> This is a **rewritten version** of `page_fix.txt` using the context template.
> Compare the two to see how much clearer this is for AI.

---

## Task 1: Home Page — Make it Feel Alive

### Priority
🔴 High — This is the first page users see

### Current State
- URL: `http://localhost:3000/`
- Currently: Static role selection cards, no animations, no glow, feels flat

### Desired State
Make the page feel **alive and premium** like a modern SaaS landing page:

1. **Subtle glow effects:**
   - Role cards should have a soft colored glow on hover (e.g., emerald glow for Gate Operator card)
   - The NAAC A+ badge should have a gentle pulsing glow
   - Logo icon should have a soft ambient glow behind it

2. **Tiny movements (micro-animations):**
   - Cards should gently float up/down on a staggered loop (like breathing)
   - Icons inside cards should subtly scale/rotate on hover
   - Arrow "→" should slide smoothly when hovering a card
   - Page title should have a subtle gradient shimmer animation
   - Background should have faint floating particles or gradient orbs

3. **Interactive elements:**
   - Cards should have a tilt effect on mouse move (3D perspective)
   - Click ripple effect on cards
   - Smooth page transition when navigating to a role

### Design Reference
- Dark theme (current `--bg-base` colors)
- Use existing CSS variables
- Framer Motion is already installed — use it

### Acceptance Criteria
- [ ] Cards have glow on hover
- [ ] Cards have floating animation
- [ ] Icons animate on hover
- [ ] Background has subtle animated gradient/particles
- [ ] Page feels "alive" without being distracting
- [ ] No performance issues (smooth 60fps)

---

## Task 2: Gate Operator — Add Login Protection

### Priority
🔴 Critical — Security issue

### Current State
- URL: `http://localhost:3000/gate/1`
- **Problem:** Visiting this URL directly opens the scan dashboard with NO login required
- Anyone can access the gate operator screen without credentials — this is dangerous

### Desired State

**Login Flow:**
1. User visits `/gate/1` → if NOT logged in → redirect to `/login?redirect=/gate/1`
2. Login page shows a **Gate Operator login form**:
   - Employee ID field (e.g., `OP001`)
   - PIN field (4-digit, numeric keypad style)
   - "Sign In" button
3. After successful login → redirect back to `/gate/1`
4. **Session persistence:** Once logged in, refreshing the page or revisiting later should NOT ask for login again (like WhatsApp/Instagram)
5. **Logout:** Only via the existing triple-tap gesture on the top-right

**Role-Based Access:**
- Only users with role `operator` can access `/gate/*`
- Gate heads (supervisor role) should also be able to access gate pages
- Other roles (admin, parent, student) → redirect to their own dashboards

### Existing Auth Infrastructure (already built)
- `src/stores/authStore.ts` — Zustand store with `persist` middleware (already saves to localStorage)
- `src/hooks/useAuth.ts` — has `loginAsRole`, `requireAuth`, `login`, `pinLogin`
- `src/app/login/page.tsx` — exists but is a **non-functional placeholder** (just a role dropdown, no actual login logic)
- `src/lib/db.ts` — has `verifyLogin`, `verifyPin`, `findUserByLogin`
- Demo credentials: Operator `OP001` / PIN `1234`

### Acceptance Criteria
- [ ] Visiting `/gate/1` without login → redirects to `/login`
- [ ] Login with `OP001` / `1234` → lands on `/gate/1`
- [ ] Wrong credentials → error message shown
- [ ] After login, refreshing `/gate/1` → stays logged in
- [ ] Logout via triple-tap → back to login
- [ ] Non-operator roles cannot access `/gate/*`

---

## Task 3: Supervisor Dashboard — Full Redesign + Login

### Priority
🔴 High — Security + Major UI improvement

### Current State
- URL: `http://localhost:3000/supervisor/live`
- **Problem 1:** No login required — anyone can access
- **Problem 2:** Dashboard is minimal — just a basic live feed list, doesn't match the design in `FIX/supervisor.excalidraw`

### Desired State

**Part A — Login Protection:**
- Same as Gate Operator: `/supervisor/*` requires supervisor credentials
- Demo credentials: Supervisor `SV001` / password `3456`
- Session persists after refresh

**Part B — Dashboard Redesign (per `FIX/supervisor.excalidraw`):**

The dashboard should have:

1. **Menu bar** with page title and navigation

2. **KPI Cards (clickable, drill-down):**
   - 🏠 **Home In and Out** — count
   - 🎓 **Day Scholars** — count
   - ☀️ **Day Out** — count
   - 👥 **Total Strength** — count
   - 📥 **In** — count
   - 📤 **Out** — count

3. **Drill-down behavior:**
   - Clicking a KPI card (e.g., "Day Scholars") expands a detailed panel below
   - Shows categorized data: Boys count, Girls count, Faculty, Visitors
   - Each category should be filterable/clickable
   - Example layout:
     ```
     Day Scholars
     ├── Boys: [count]
     ├── Girls: [count]
     ├── Faculty: [count]
     └── Visitors: [count]
     ```

4. **Live Feed section** (at `/supervisor/live`):
   - Real-time in/out events with columns:
     - **Name**
     - **Roll ID**
     - **Operation** (Entry/Exit with color coding)
     - **Time**
     - **Operator**
     - **Photo** (avatar)
   - Clicking an event → opens **detailed view** with complete log
   - **Filters:** by direction (entry/exit), by gate, by time range

5. **Corrections section** — existing page, keep but improve styling

6. **Critical Alerts panel** — show alerts with severity colors

7. **Active Gate Operator status** — show which operator is on duty

### Design Reference
- `FIX/supervisor.excalidraw` — the full wireframe
- Dark theme, consistent with existing app
- KPI cards should have hover glow + click feedback

### Acceptance Criteria
- [ ] `/supervisor/*` requires login
- [ ] Session persists after refresh
- [ ] Dashboard shows all KPI cards from the Excalidraw
- [ ] Clicking a KPI card expands detailed categorized data below
- [ ] Live feed shows Name, Roll, Operation, Time, Operator, Photo
- [ ] Live feed has filters
- [ ] Clicking a live event opens a detailed view
- [ ] Critical alerts panel visible
- [ ] Active gate operator status visible

---

## Reference Files for AI

- `FIX/supervisor.excalidraw` — Supervisor dashboard wireframe
- `gate/Gate_Monitoring_Master_Prompt.md` — Full system spec (roles, permissions, design system)
- `gate-monitor/src/stores/authStore.ts` — Auth store (already has persist)
- `gate-monitor/src/hooks/useAuth.ts` — Auth hook
- `gate-monitor/src/app/login/page.tsx` — Login page (needs to be made functional)
- `gate-monitor/src/app/(operator)/gate/[gateId]/page.tsx` — Gate operator page
- `gate-monitor/src/app/supervisor/live/page.tsx` — Supervisor live page
- `gate-monitor/src/components/supervisor/LiveFeed.tsx` — Current live feed component
- `gate-monitor/src/lib/db.ts` — Database functions (verifyLogin, verifyPin)
- `gate-monitor/src/lib/types.ts` — Type definitions

---

## Constraints

- Use existing CSS variables (`--bg-base`, `--bg-surface`, `--border`, etc.)
- Use existing components (shadcn/ui, Framer Motion, Zustand)
- Don't change the database schema
- Don't add new dependencies unless absolutely necessary
- Keep the dark theme consistent
- Use Inter font
````

## File: FIX/page_fix.txt
````
http://localhost:3000/ for this page improve more  elements interacive and try to add some subtle glow or some subtle tiny movements which feels site feels alive 

fix : http://localhost:3000/gate
in this page it was directly directing to scan dahsboard which is a danger for that purpose we have to  add credentioas page to let them login and ensure if a person login then it should never ask for login again like our top tech social media apps or sites it...
in that page this access level can be role based too we are gooing to provide this alevel of access to only the gate and gate  heads and accoding to their authority so like that 

http://localhost:3000/supervisor 
in this page also e need credentials to access to bcoz, higher authority have their own credientials and that stuff so make sure that one ore login and don't fogot store the credentias and that stuff  no repeated logins and the this dashboard shoud look like i am going to mention in the excalidraw file check in it as "supervisor" so
````

## File: FIX/ROLL_NUMBER_SEMANTICS.md
````markdown
# 🎓 ROLL NUMBER (HALL TICKET) SEMANTICS — GATE MONITOR

> **Project:** Student Gate Monitoring System — JNTUH University College of Engineering, Nachupally (Kondagattu)
> **Purpose:** This document defines the *complete semantics* (meaning, structure, and backend integration) of student roll numbers / hall ticket numbers across the gate-monitor application.
> **Reference:** SEMANTICS_GATE_MONITOR.md + `src/lib/rollNumber.ts` + `src/lib/db.ts` + `Plan/Gate_Monitoring_BACKEND_Architecture.md`

---

## 1. THE 10-CHARACTER STRUCTURAL BLUEPRINT

A standard roll number (e.g., **`24JJ1A0201`** or **`25JJ5A1203`**) follows a strict 5-part composite schema:

```
 ┌──────┬─────────┬────────────┬─────────────┬──────────┐
 │  25  │   JJ    │     5A     │     12      │    03    │
 └──────┴─────────┴────────────┴─────────────┴──────────┘
  Year   College   Entry/Degree  Department   Sequence
  (YY)    (CC)        (ED)         (BB)       (SS)
  2 dig  2 alpha   2 alnum     2 digits     2 alnum
```

### Formal Regex (as implemented in `src/lib/rollNumber.ts`)

```ts
export const ROLL_NUMBER_REGEX = /^(\d{2})([A-Z]{2})([0-9A-Z]{2})(\d{2})([0-9A-Z]{2})$/;
```

| Capture Group | Position | Length | Pattern | Meaning |
|---------------|----------|--------|---------|---------|
| `YY` | 1–2 | 2 digits | `\d{2}` | Last 2 digits of admission year |
| `CC` | 3–4 | 2 uppercase letters | `[A-Z]{2}` | College/institution code |
| `ED` | 5–6 | 2 alphanumeric | `[0-9A-Z]{2}` | Entry mode & degree code |
| `BB` | 7–8 | 2 digits | `\d{2}` | Department/branch code |
| `SS` | 9–10 | 2 alphanumeric | `[0-9A-Z]{2}` | Student serial/index |

---

## 2. COMPONENT-BY-COMPONENT BREAKDOWN

### 2.1 A. Admission Year (`YY`) — 2 Digits

| Aspect | Detail |
|--------|--------|
| **Position** | Characters 1–2 |
| **Meaning** | Last two digits of the academic year of admission |
| **Regex** | `\d{2}` |
| **Examples** | `24` → 2024 Batch, `25` → 2025 Batch |
| **Backend resolution** | `admissionYear = 2000 + parseInt(yearCode, 10)` |

**Backend type (`RollNumberDecoded`):**
```ts
admissionYear: number;   // Full 4-digit year e.g. 2024
yearCode: string;        // 2-digit year prefix e.g. "24"
```

---

### 2.2 B. College/Institution Code (`CC` — 2 Alphabetic Characters)

| Aspect | Detail |
|--------|--------|
| **Position** | Characters 3–4 |
| **Meaning** | Unique university campus identifier |
| **Regex** | `[A-Z]{2}` |
| **Dataset** | `JJ` → **JNTUH University College of Engineering Jagtial (UCEJ)** |
| **Validation** | Must exist in `COLLEGE_CODES` dict (rollNumber.ts) or parse returns `null` |

**Backend mapping (`COLLEGE_CODES` in rollNumber.ts):**
```ts
export const COLLEGE_CODES: Record<string, CollegeInfo> = {
  JJ: {
    code: "JJ",
    name: "JNTUH University College of Engineering Jagtial (UCEJ)",
    shortName: "JNTUH-UCEJ",
  },
};
```

**Full name (`CollegeInfo`):**
```ts
interface CollegeInfo {
  code: CollegeCode;        // "JJ"
  name: string;             // Full college name
  shortName: string;        // "JNTUH-UCEJ"
}
```

---

### 2.3 C. Entry Mode & Degree Code (`ED` — 2 Alphanumeric Characters)

| Aspect | Detail |
|--------|--------|
| **Position** | Characters 5–6 |
| **Meaning** | Academic course level and mode of admission |
| **Regex** | `[0-9A-Z]{2}` |
| **Allowed values** | `1A` → Regular B.Tech, `5A` → Lateral Entry B.Tech |
| **Validation** | Must exist in `ENTRY_MODE_CODES` dict, else parse returns `null` |

**Backend mapping (`ENTRY_MODE_CODES` in rollNumber.ts):**
```ts
export const ENTRY_MODE_CODES: Record<string, EntryModeInfo> = {
  "1A": { code: "1A", label: "Regular B.Tech",
          description: "Regular 4-Year B.Tech (joined in 1st year)",
          durationYears: 4 },
  "5A": { code: "5A", label: "Lateral Entry B.Tech",
          description: "Lateral Entry B.Tech (Joined directly into 2nd year / 3rd semester)",
          durationYears: 3 },
};
```

**Backend payload fields:**
```ts
entryModeCode: "1A" | "5A";
entryMode: "Regular B.Tech" | "Lateral Entry B.Tech";
entryModeDescription: string;   // Full description
```

---

### 2.4 D. Department/Branch Code (`BB` — 2 Digits)

| Aspect | Detail |
|--------|--------|
| **Position** | Characters 7–8 |
| **Meaning** | Engineering branch / academic department |
| **Regex** | `\d{2}` |
| **Allowed values** | `02` → EEE, `03` → ME, `04` → ECE, `05` → CSE, `12` → IT |
| **Validation** | Must exist in `ROLL_DEPT_CODES`, else parse returns `null` |

**⚠️ CRITICAL: Roll-number codes differ from internal department codes!**

| Roll `BB` code | Department (short) | Department (full) |
|----------------|---------------------|-------------------|
| `02` | EEE | Electrical & Electronics Engineering |
| `03` | ME | Mechanical Engineering |
| `04` | ECE | Electronics & Communication Engineering |
| `05` | CSE | Computer Science & Engineering |
| `12` | IT | Information Technology |

**Backend mapping (`ROLL_DEPT_CODES` in rollNumber.ts) — note this is DIFFERENT from `DEPARTMENT_CODES` in types.ts:**
```ts
export const ROLL_DEPT_CODES: Record<string, { short: string; full: string }> = {
  "02": { short: "EEE", full: "Electrical & Electronics Engineering" },
  "03": { short: "ME",  full: "Mechanical Engineering" },
  "04": { short: "ECE", full: "Electronics & Communication Engineering" },
  "05": { short: "CSE", full: "Computer Science & Engineering" },
  "12": { short: "IT",  full: "Information Technology" },
};
```

> ⚠️ **Why the 12 → IT mapping:**
> - JNTUH stopped the CSE/IT branch code system. `05` = CSE, `12` = IT.
> - The older `DEPARTMENT_CODES` in GATE MONITOR types.ts uses `01`→CSE, `02`→IT, `03`→ECE, `04`→EEE, `05`→ME — **only for the demo dataset used in existing stores/components, NOT for actual roll parsing.**

**Backend fields on the `RollNumberDecoded`:**
```ts
departmentCode: string;             // Raw code ("02", "12")
department: string;                 // Short name ("EEE", "IT")
departmentFullName: string;         // Full name ("Electrical & Electronics Engineering")
branch: string;                     // "EEE — Regular B.Tech"
```

---

### 2.5 E. Individual Serial/Index (`SS` — 2 Alphanumeric Characters)

| Aspect | Detail |
|--------|--------|
| **Position** | Characters 9–10 |
| **Meaning** | Running sequential index within batch + dept + entry |
| **Regex** | `[0-9A-Z]{2}` |
| **Examples** | `01`, `02`, `03` ... up to `99`; `A0`, `B1` for larger cohorts |
| **Backend handling** | Numeric parsing via `serialNumber?: number` when purely digits |

```ts
serial: string;           // Raw serial e.g. "01", "A0"
serialNumber?: number;    // Numeric 01–99 when purely digits
```

---

## 3. DECODED FOR EXAMPLES

| Roll Number | Year | College | Entry Type | Department | Student Serial |
|-------------|------|---------|------------|------------|----------------|
| `24JJ1A0201` | 2024 | JNTUH UCEJ (`JJ`) | Regular B.Tech (`1A`) | EEE (`02`) | Student 01 |
| `24JJ1A1236` | 2024 | JNTUH UCEJ (`JJ`) | Regular B.Tech (`1A`) | IT (`12`) | Student 36 |
| `25JJ5A1203` | 2025 | JNTUH UCEJ (`JJ`) | Lateral Entry (`5A`) | IT (`12`) | Student 03 |
| `24JJ1A0501` | 2024 | JNTUH UCEJ (`JJ`) | Regular B.Tech (`1A`) | CSE (`05`) | Student 01 |
| `25JJ1A0512` | 2025 | JNTUH UCEJ (`JJ`) | Regular B.Tech (`1A`) | CSE (`05`) | Student 12 |
| `24JJ5A0307` | 2024 | JNTUH UCEJ (`JJ`) | Lateral Entry (`5A`) | ME (`03`) | Student 07 |

**Example decoded TypeScript object** (from `parseRollNumber("25JJ5A1203")`):

```ts
{
  raw:                "25JJ5A1203",
  admissionYear:      2025,
  yearCode:           "25",
  collegeCode:        "JJ",
  collegeName:        "JNTUH University College of Engineering Jagtial (UCEJ)",
  collegeShortName:   "JJ-UCEJ",
  entryModeCode:      "5A",
  entryMode:          "Lateral Entry B.Tech",
  entryModeDescription: "Lateral Entry B.Tech (Joined directly into 2nd year / 3rd semester)",
  departmentCode:     "12",
  department:         "IT",
  departmentFullName: "Information Technology",
  branch:             "IT — Lateral Entry B.Tech",
  serial:             "03",
  serialNumber:       3,
}
```

---

## 4. CORE FUNCTIONS IN `src/lib/rollNumber.ts`

| Function | Signature | Semantics |
|----------|-----------|-----------|
| `parseRollNumber(roll)` | `(string|null) → RollNumberDecoded \| null` | Full structural decode + semantic validation |
| `validateRollNumber(roll)` | `(string) → boolean` | `true` if parse succeeds, `false` otherwise |
| `formatRollNumber(decoded)` | `(Partial<RollNumberDecoded>) → string` | Reconstruct the 10-char string from components (used for re-building UI display or slots) — concatenates YY+CC+ED+BB+SS |
| `getDepartmentFromRoll(roll)` | `(string) → string \| null` | Extract dept short-name (e.g. "EEE"); bridges roll codes → internal department names |
| `getAdmissionYearFromRoll(roll)` | `(string) → number \| null` | Full 4-digit year e.g. 2024 |
| `getStudentYearFromRoll(roll, now?)` | `(string, Date?) → number \| null` | Year of study: `currentYear - admissionYear + 1` (clamped ≥ 1) |
| `describeRollNumber(roll)` | `(string) → string` | Human-readable string e.g. `"2024 • JJ (JNTUH-UCEJ) • Regular B.Tech • EEE • Student 01"` |

### Sample Roll Pool (exported for demos)

```ts
export const SAMPLE_ROLL_NUMBERS: string[] = [
  "24JJ1A0201", // 2024, UCEJ, Regular, EEE,  #01
  "24JJ1A0501", // 2024, UCEJ, Regular, CSE,  #01
  "24JJ1A1201", // 2024, UCEJ, Regular, IT,   #01
  "24JJ1A0401", // 2024, UCEJ, Regular, ECE,  #01
  "24JJ1A0301", // 2024, UCEJ, Regular, ME,   #01
  "25JJ5A1203", // 2025, UCEJ, Lateral Entry, IT, #03
  "25JJ1A0512", // 2025, UCEJ, Regular, CSE,  #12
  "24JJ5A0307", // 2024, UCEJ, Lateral Entry, ME, #07
];
```

---

## 5. BACKEND INTEGRATION — HOW ROLL NUMBERS FLOW THROUGH THE SYSTEM

### 5.1 Roll number in the Database (`students` table)

The backend `students` table stores the roll number as the **primary lookup key** for scanning:

```
┌──────────────────────────────────────────────────────────────────┐
│  students table (Supabase / PostgreSQL)                          │
├──────────────────────────────────────────────────────────────────┤
│  id         UUID (internal)        — never exposed in scans      │
│  roll       VARCHAR UNIQUE NOT NULL — e.g. "24JJ1A0201"         │
│  name, department (short e.g. "EEE"), year (1-4), section, batch │
│  photo, email, phone, parent_name, parent_phone, parent_id      │
│  qr_code, id_valid_until, status                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Key mapping:** `roll` column stores the full 10-character string; but `department` column stores the **internal short name** (`EEE`, `CSE`, `IT`). When a roll is parsed, `getDepartmentFromRoll()` bridges the roll's `BB` code (`02`, `05`, `12`) to the internal short name.

### 5.2 Data layer functions (`src/lib/db.ts`)

| Function | How roll is used | Semantics |
|----------|------------------|-----------|
| `findStudentByRoll(rollNum)` | `eq('roll', rollNum.trim().toUpperCase())` | Lookup by exact roll (case-insensitive, trimmed) |
| `findAllStudents()` | `.order('roll')` | All students listed by roll |
| `searchStudents(q)` | `or(roll.ilike, name.ilike, department.ilike)` | Fuzzy search |
| `findByQr(payload)` | `findStudentByRoll(payload.trim().toUpperCase().replace(/\s+/g,""))` | QR payload → roll lookup (normalises whitespace) |
| `lastScanFor(roll)` | `eq('roll', roll).order('timestamp', desc).limit(1)` | Most recent scan for that student |
| `inferDirection(roll)` | `lastScanFor(roll)` → toggle IN/OUT | Auto-detect scan direction |
| `isDuplicate(roll, dir)` | `eq('roll', roll).eq('direction', dir).gte(cutoff,5min)` | 5-minute dup-prevention window |
| `addScan(input)` | uses `input.roll` for finding student + logging | Core write op — see §5.4 |
| `getStudentStatus(roll)` | subquery `students where roll = '${roll}'` | Campus occupancy status |
| `getStudentHistory(roll)` | `eq('roll', roll)` | Student scan history |
| `getAllLogs(f)` | `or(roll.ilike, name.ilike)` | Filterable log search |
| `dashboard()` | aggregates scans by dept | Admin KPIs |

### 5.3 `addScan` — The core roll-driven write operation

```
addScan({ roll, direction, reason?, gateId, operatorId, isManual? })
   │
   ├── 1. findStudentByRoll(roll)
   │        └─ roll NOT in students → throw "STUDENT_NOT_FOUND"
   │
   ├── 2. isDuplicate(roll, direction, 5 min)
   │        └─ same roll + same direction within 5min → return { duplicate: true }
   │
   ├── 3. findGateById(gateId) + findUserById(operatorId)
   │
   ├── 4. INSERT into gate_logs
   │        └─ roll, name, department (from student), direction, reason,
   │           gate_id, gate_name, operator_id, operator_name, timestamp, is_manual
   │
   ├── 5. UPSERT into campus_occupancy (on student_id)
   │
   ├── 6. addAudit: "SCAN_CREATED" + direction + name + roll + gate
   │
   └── 7. addNotification → parent (gate_entry type)
```

### 5.4 Gate log record shape (`gate_logs` table)

| Column | Source | Example |
|--------|--------|---------|
| `roll` | Denormalised from students | `24JJ1A0201` |
| `name` | Denormalised | `"K. Rahul"` |
| `department` | Denormalised (short) | `"EEE"` |
| `year` | Denormalised (1–4) | `3` |
| `direction` | IN/OUT | `"IN"` |
| `timestamp` | ISO | `2026-08-15T09:12:43Z` |
| `gate_id`/`gate_name` | Gate lookup | `"gate-1"` / `"Gate 1 (Main)"` |

---

## 6. API ENDPOINTS INVOLVING ROLL NUMBERS

| Endpoint | Method | How roll is used |
|----------|--------|------------------|
| `/api/gate/scan` | POST | Body `{ roll, direction, reason, gateId, operatorId }` → `addScan` |
| `/api/gate/scan` | GET | Returns `statsToday()` + gates |
| `/api/gate/logs` | GET | Query `search` does ILIKE roll/name across `gate_logs` |
| `/api/students` | GET | Returns **all** students (roll is key) |
| `/api/students/[roll]` | GET | Finds by roll via `findStudentByRoll` |
| `/api/supervisor/live-events` | GET | Recents events carry roll |
| `/api/passes` | GET/POST | Gate passes keyed to student roll |

---

## 7. BACKEND ARCHITECTURE REFERENCES (from `Plan/Gate_Monitoring_BACKEND_Architecture.md`)

### 7.1 Database trigger — auto-update campus occupancy

```sql
CREATE OR REPLACE FUNCTION update_campus_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO campus_occupancy (student_id, current_status, last_gate_id, last_log_id, last_updated)
    VALUES (NEW.student_id, NEW.direction, NEW.gate_id, NEW.id, NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET
        current_status = NEW.direction,
        last_gate_id = NEW.gate_id,
        last_log_id = NEW.id,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_occupancy
AFTER INSERT ON gate_logs
FOR EACH ROW
EXECUTE FUNCTION update_campus_occupancy();
```

> **Note:** This is the *design* in the backend-architecture doc. The **implemented** `addScan` in `db.ts` performs the same logic in application code (upsert into `campus_occupancy`).

### 7.2 QR validation pipeline (from backend architecture doc)

```
1. AUTHENTICATE operator (valid token, assigned gate)
2. VALIDATE QR (payload → resolve to roll → student)
3. CHECK student status (active?)
4. CHECK ID validity (not expired?)
5. CHECK duplicate scan (same roll, same direction, 5 min)
6. CHECK direction logic (auto-suggest via inferDirection)
7. CHECK gate pass (if OUT)
8. CREATE gate_log
9. UPDATE campus_occupancy (trigger)
10. QUEUE notifications
11. EMIT real-time event
12. RETURN success
```

### 7.3 Dedupe / direction logic (backend architecture doc → as implemented in db.ts)

```ts
// isDuplicate (db.ts)
const cutoff = new Date(Date.now() - min * 60000).toISOString();
// select id from gate_logs where roll = ? and direction = ? and timestamp >= cutoff

// inferDirection (db.ts)
const l = await lastScanFor(roll);
return l ? (l.direction === "IN" ? "OUT" : "IN") : "IN";
```

---

## 8. AUTHENTICATION & ROLL RELATIONSHIP

| Auth concept | Roll usage |
|------------|-----------|
| `users` table | Staff accounts only — no roll needed; `employee_id` used instead |
| `students` table | `roll` is the student's identity for scans; `parent_id` links to parent |
| Operator PIN login | `OP001` employee_id + PIN — unrelated to roll schema |
| Demo creds | `stu-1` student login → maps to student record with a real roll |

The **roll number is the student-facing ID**; employee IDs (`OP001`, `AD001`, etc.) are staff-facing.

---

## 9. FRONTEND ↔ BACKEND INTEGRATION FLOW (END-TO-END)

```
┌────────────────────────────────────────────────────────────────────┐
│                        GATE OPERATOR UI                          │
│  Scanner.tsx (QR payload) → startScan(roll) → operatorStore       │
│       │                                                       │
│       ▼                                                       │
│  findStudentByRoll(roll) via /api/gate/scan                    │
│       │                                                       │
│       ▼                                                       │
│  parseRollNumber(roll) [display decoded semantic tags]         │
│  inferDirection(roll) → show IN/OUT toggle                      │
│       │                                                       │
│       ▼                                                       │
│  confirmScan() → duplicate check + addScan                    │
│       │                                                       │
│       ▼                                                       │
│  gate_logs INSERT + campus_occupancy UPSERT                    │
│  + audit_logs INSERT + notifications INSERT                    │
│       │                                                       │
│       ▼                                                       │
│  statsToday() → operator store UI (success flash)             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 10. ROLL NUMBERS vs. INTERNAL DEPARTMENT CODES (IMPORTANT CAUTION)

| Roll `BB` code | Internal store (`types.ts DEPARTMENT_CODES`) | Semantics |
|-----------------|---------------------------------------------|-----------|
| `05` | `CSE` | Roll `05` → CSE via `ROLL_DEPT_CODES` |
| `02` | `IT` (in types.ts) | **CONFLICT:** roll `02`→EEE in `rollNumber.ts`, but `types.ts` maps `"02"`→IT |
| `12` | — (not in types.ts) | Roll `12` → IT via `rollNumber.ts` |
| `03` | `ECE` (types.ts) | Roll → ME per rollNumber.ts |
| `04` | `EEE` (types.ts) | Roll → ECE per rollNumber.ts |

**⚠️ CRITICAL IMPLEMENTATION NOTE:**
- `src/lib/rollNumber.ts` (the **roll parser**) uses the **canonical JNTUH roll code table**: `02→EEE`, `03→ME`, `04→ECE`, `05→CSE`, `12→IT`.
- Anything in `src/lib/types.ts` (`DEPARTMENT_CODES`) is only used for legacy demo dataset assembly; do **NOT** use it to decode a roll.
- Whenever you map roll `BB` to a department, always go through `getDepartmentFromRoll()` / `parseRollNumber()`.

---

## 11. CONSISTENCY CHECKLIST for BACKEND developers

When you need to use a roll number in backend code, mentally check:

1. **Normalise** — `roll.trim().toUpperCase().replace(/\s+/g, "")` → match `db.ts` behaviour.
2. **Parse** — use `parseRollNumber()` to get semantic components; fallback to `null` if invalid.
3. **Never re-dedupe client-side** — always call `isDuplicate(roll, direction)` server-side.
4. **Never re-infer direction client-side** — always call `inferDirection(roll)` server-side.
5. **Write restricted** — always go through `addScan()` (validates student, prevents dup, updates occupancy, audits, notifies).
6. **Dept conversions** — use `getDepartmentFromRoll()` rather than `DEPARTMENT_CODES` in types.ts.
7. **Year-of-study** — `getStudentYearFromRoll()` not manual arithmetic; it clamps ≥1.
8. **Lateral entry note** — 5A students enter at 2nd year; their `year` field/`getStudentYearFromRoll` auto +1 may differ from their actual academic year — the admission year (2-digit prefix) correctly identifies their entry cohort.
9. **Where rolls appear in the backend**: `students.roll`, `gate_logs.roll`, `gate_pass_requests.roll`, `alert.studentRoll`, `gate_pass.qr` — all the same 10-char canonical string.
10. **QR payload** — the QR code QR payload is **normalized the same way** as `findByQr(payload)` does: `trim→uppercase→strip whitespace`.

---

## 12. SAMPLE QUERIES (SQL)

```sql
-- Find all students of a given branch using ROLL semantics (not department column)
SELECT * FROM students
WHERE roll ~ '^25JJ[15]A050[0-9]{2}$';   -- 2025 batch, regular OR lateral, CSE, any serial

-- Count active students per roll-branch (uses decoding)
SELECT dept_code AS department_from_roll, COUNT(*)
FROM (
  SELECT SUBSTRING(roll FROM 7 FOR 2) AS dept_code
  FROM students
) t
GROUP BY dept_code;

-- Find duplicate scans in the last 5 minutes
SELECT roll, direction, COUNT(*)
FROM gate_logs
WHERE timestamp >= NOW() - INTERVAL '5 minutes'
GROUP BY roll, direction
HAVING COUNT(*) > 1;
```

---

## 13. INTERNAL BACKEND MAP — WHAT TO READ NEXT

| Need | Read |
|------|------|
| Roll number parser/decoder | `gate-monitor/src/lib/rollNumber.ts` |
| Student/Sall/scan backend functions | `gate-monitor/src/lib/db.ts` |
| DB schema (design) | `Plan/Gate_Monitoring_BACKEND_Architecture.md` §2 |
| Scan API route | `gate-monitor/src/app/api/gate/
| JWT/auth | `gate-monitor/src/lib/auth.ts` |
| Types/interfaces | `gate-monitor/src/lib/types.ts` |

---

*Document generated from direct source analysis of the `gate-monitor` codebase — rollNumber.ts, db.ts, types.ts, auth.ts, gate/scan API + the backend architecture plan. Roll semantics reflect the actual implemented parsing logic, not just the raw scheme.*
</task_progress>
</write_to_file>
````

## File: FIX/SEMANTICS_GATE_MONITOR.md
````markdown
# 🏛️ GATE MONITOR — SITE SEMANTICS & CONTEXT DOCUMENT

> **Project:** Student Gate Monitoring System — JNTUH University College of Engineering, Nachupally (Kondagattu)
> **Purpose:** This document defines the *semantics* (meaning, intent, and relationships) of every part of the gate-monitor application, so any developer can understand the context of the entire site at a glance.

---

## 1. WHAT THE SYSTEM IS

A **digital replacement for the manual paper-register gate log** at a college campus. It tracks when students **enter** and **exit** campus through gates by scanning QR codes on their ID cards, and surfaces that data to different stakeholders (security, supervisors, admin, parents, students) through role-specific portals.

### Core Domain Concepts (Semantic Vocabulary)

| Concept | Meaning |
|---------|---------|
| **Scan** | A single recorded event of a student passing a gate (direction: IN or OUT). |
| **Direction** | `IN` (entering campus) or `OUT` (exiting campus). |
| **Exit Reason** | Why a student left: `Home Out`, `Day Out`, `Leave`, `Regular`. |
| **Gate** | A physical entry/exit point (Main, Hostel, Back Gate). |
| **Gate Pass** | A pre-approved permission for a student to leave, requiring parent + admin approval. |
| **Campus Occupancy** | The live count/status of which students are currently inside campus. |
| **Alert** | A system-generated warning (critical/warning/info) about unusual activity. |
| **Audit Trail** | Immutable log of every action (who, what, when, where, why). |
| **Role** | Access level: `operator`, `supervisor`, `admin`, `sysadmin`, `parent`, `student`. |

---

## 2. ARCHITECTURE OVERVIEW

```
┌────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                         │
│                    React 19 · TypeScript · Tailwind v4             │
├────────────────────────────────────────────────────────────────────┤
│  ROUTE GROUPS (role-based)                                         │
│  (admin) /admin        (operator) /gate/[gateId]                   │
│  (parent) /parent      (student) /student                          │
│  (sysadmin) /sysadmin  supervisor/ (no group)                      │
├────────────────────────────────────────────────────────────────────┤
│  STATE: Zustand stores (auth, operator, admin, ui)                 │
│  DATA:  Supabase (PostgreSQL) via @/lib/db.ts                      │
│  AUTH:  JWT (jose) + bcrypt + PIN login                            │
│  UI:    shadcn/ui primitives + framer-motion + recharts            │
└────────────────────────────────────────────────────────────────────┘
```

**Key architectural facts:**
- **Route groups** (`(admin)`, `(operator)`, etc.) organize role-based sections **without changing the URL**. The URL is determined by the inner folder (`(admin)/admin` → `/admin`).
- **Data layer** is centralized in `src/lib/db.ts`, which wraps Supabase queries. Many functions are **placeholder stubs** (log a warning, return empty) — only student/gate/user/scan/occupancy functions are fully implemented.
- **Auth** uses JWT (HS256, 7-day expiry) signed with `jose`, plus bcrypt password hashing and PIN verification for operators.
- **Demo mode**: `useAuth` auto-logs-in with seeded credentials per role (e.g. operator `OP001`/`1234`).

---

## 3. ROUTING & PAGE SEMANTICS

### 3.1 URL → Page Map

| URL | Route Group | Page | Semantic Role |
|-----|-------------|------|---------------|
| `/` | — | `page.tsx` | **Role selection landing** — entry point that routes users to their portal |
| `/login` | — | `login/page.tsx` | **Login stub** — UI only, not wired to auth |
| `/admin` | `(admin)` | `admin/page.tsx` | **Admin dashboard** — KPIs, charts, student list |
| `/admin/dashboard` | `(admin)` | `admin/dashboard/page.tsx` | Admin dashboard (sub-page) |
| `/admin/students` | `(admin)` | `admin/students/page.tsx` | Student management |
| `/admin/attendance` | `(admin)` | `admin/attendance/page.tsx` | Attendance view |
| `/admin/alerts` | `(admin)` | `admin/alerts/page.tsx` | Alerts management |
| `/admin/reports` | `(admin)` | `admin/reports/page.tsx` | Reports/analytics |
| `/admin/settings` | `(admin)` | `admin/settings/page.tsx` | Admin settings |
| `/gate/[gateId]` | `(operator)` | `gate/[gateId]/page.tsx` | **Gate Operator scanner** — the core scanning UI |
| `/parent` | `(parent)` | `parent/page.tsx` | Parent dashboard — child status |
| `/parent/child` | `(parent)` | `parent/child/page.tsx` | Child detail view |
| `/parent/passes` | `(parent)` | `parent/passes/page.tsx` | Gate pass approvals |
| `/parent/settings` | `(parent)` | `parent/settings/page.tsx` | Parent settings |
| `/student` | `(student)` | `student/page.tsx` | Student dashboard — digital ID |
| `/student/history` | `(student)` | `student/history/page.tsx` | Personal gate history |
| `/student/id` | `(student)` | `student/id/page.tsx` | Digital ID card |
| `/student/passes` | `(student)` | `student/passes/page.tsx` | Gate pass requests |
| `/sysadmin` | `(sysadmin)` | `sysadmin/page.tsx` | System admin — users, gates, settings |
| `/supervisor/live` | — | `supervisor/live/page.tsx` | Supervisor live feed |
| `/supervisor/corrections` | — | `supervisor/corrections/page.tsx` | Supervisor corrections |

### 3.2 Layout Semantics

| Layout | Provides | Auth Guard |
|--------|----------|-----------|
| `app/layout.tsx` | Root layout, global CSS | — |
| `(admin)/layout.tsx` | `Sidebar` + `Header` + main content | Reads role from `sessionStorage` |
| `(operator)/layout.tsx` | Operator shell | — |
| `(parent)/layout.tsx` | Parent shell | — |
| `(student)/layout.tsx` | Student shell | — |
| `(sysadmin)/layout.tsx` | Sysadmin shell | — |
| `supervisor/layout.tsx` | Supervisor shell | — |
| `login/layout.tsx` | Login shell | — |

**Sidebar semantics** (`components/shared/Sidebar.tsx`):
- Reads the selected role from `sessionStorage["gate-monitor-role"]`.
- Renders role-specific nav items (e.g. operator → Gate 1/Gate 2; admin → Dashboard).
- If no role stored, redirects to `/`.
- Logout clears `sessionStorage` and returns to `/`.

---

## 4. DATA MODEL SEMANTICS (`src/lib/types.ts`)

### 4.1 Roles
```ts
type Role = "operator" | "supervisor" | "admin" | "sysadmin" | "parent" | "student";
```

### 4.2 Core Entities

| Entity | Key Fields | Semantic Meaning |
|--------|-----------|------------------|
| **User** | id, name, role, gateId, employeeId, email, phone, pin, parentId | A system account. `gateId` links operators to a gate; `pin` enables PIN login. |
| **Student** | id, roll, name, department, year, section, batch, photo, email, phone, parentName, parentPhone, parentId, qrCode, idValidUntil, status | A registered student. `qrCode` is scanned at gates; `idValidUntil` gates ID expiry; `parentId` links to parent. |
| **Department** | code, name, hod | Academic department (CSE, IT, ECE, EEE, ME). |
| **Gate** | id, name, location, type, isActive | Physical gate. `type`: main/hostel/back. |
| **Scan** | id, roll, name, department, year, direction, reason, gateId, gateName, operatorId, operatorName, timestamp, isManual, isCorrection, originalScanId | A gate event. `isManual` = entered without QR; `isCorrection` = edited record; `originalScanId` links corrections. |
| **GatePass** | id, roll, studentName, department, reason, from, to, description, requestedById/Name, parentStatus, adminStatus, finalStatus, parentComment, adminComment, qrCode | A leave request requiring parent + admin approval. |
| **Alert** | id, severity, title, message, gateId, studentRoll, timestamp, resolved | System warning. Severity: low/medium/high/critical. |
| **AuditEntry** | id, action, userId, userName, role, timestamp, details, gateId | Immutable action log. |
| **DashboardData** | onCampus, todayIn, todayOut, totalScans, activeAlerts, trends, locations, activityFeed, deptBreakdown, alerts, gatePasses | Aggregated admin dashboard payload. |

### 4.3 Enums
```ts
type ExitReason = "Home Out" | "Day Out" | "Leave" | "Regular";
type ScanDirection = "IN" | "OUT";
type GatePassStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPROVED_PARENT" | "APPROVED_ADMIN" | "COMPLETED";
type AlertSeverity = "low" | "medium" | "high" | "critical";
```

---

## 5. DATA LAYER SEMANTICS (`src/lib/db.ts`)

### 5.1 College Reference Data
```ts
COLLEGE = {
  name: "JNTUH University College of Engineering, Nachupally (Kondagattu)",
  shortName: "JNTUH-UCoEJ",
  address: "...Jagtial Dist, Telangana — 505 501",
  accreditation: "NAAC A+ Grade",
  principal: "Dr. G. Narsimha",
}
```
- **DEPARTMENTS**: CSE, IT, ECE, EEE, ME (with HOD names).
- **GATES**: `gate-1` (Main, active), `gate-2` (Hostel, active), `gate-3` (Back, inactive).

### 5.2 Implemented Functions (real Supabase queries)

| Function | Semantics |
|----------|-----------|
| `findStudentByRoll(roll)` | Look up a student by roll number (uppercased, trimmed). |
| `findAllStudents()` | All students ordered by roll. |
| `searchStudents(q)` | Fuzzy search by roll/name/department (ILIKE, limit 20). |
| `findByQr(payload)` | Resolve a QR payload to a student (normalizes whitespace). |
| `findGateById(id)` / `findAllGates()` | Gate lookup. |
| `findUserById(id)` / `findUserByLogin(login)` | User lookup by id or login (employee_id/email/name). |
| `verifyLogin(login, password)` | bcrypt password verification. |
| `verifyPin(userId, pin)` | PIN verification for operators. |
| `lastScanFor(roll)` | Most recent scan for a student (for direction inference). |
| `scansToday()` | All scans within today's UTC date range. |
| `studentsInside()` / `campusCount()` | Students currently IN campus (from `campus_occupancy`). |
| `isDuplicate(roll, direction, min=5)` | Duplicate-scan prevention within 5 minutes. |
| `inferDirection(roll)` | Auto-detect direction: if last was IN → OUT, else IN. |
| `addScan(input)` | **Core write op**: validates student, checks duplicate, inserts into `gate_logs`, upserts `campus_occupancy`, writes audit log + parent notification. |
| `getAllLogs(filters)` | Paginated, filterable gate log query. |
| `dashboard()` | Aggregates KPIs, locations, activity feed for admin. |
| `statsToday()` | Operator stats: entries, exits, onCampus, lastScan, recentScans. |
| `getStudentStatus(roll)` / `getStudentHistory(roll)` | Parent/student views. |
| `getParentChildren(parentId)` | Students linked to a parent. |

### 5.3 Placeholder Stubs (NOT implemented — log warning, return empty)
`resolveAlert`, `findPass`, `approvePass`, `rejectPass`, `createGatePass`, `findGatePasses`, `correctionCandidates`, `correctScan`, `getAllGatesLive`, `getAlerts`, `getNotifications`, `getUserForSession`, `createSession`, `invalidateSession`.

> ⚠️ **Important semantic note:** The gate-pass workflow, alerts, corrections, and session persistence are **scaffolded but not functional**. The system currently works end-to-end only for **scanning** (addScan → gate_logs → campus_occupancy → audit → notification).

---

## 6. AUTHENTICATION SEMANTICS

### 6.1 Flow
1. **Login** (`authStore.login`): `verifyLogin` (bcrypt) → `signToken` (JWT HS256, 7d) → `createSession` → persist to `localStorage["gate-monitor-auth"]`.
2. **PIN login** (`authStore.pinLogin`): for operators — `findUserByLogin` + `verifyPin`.
3. **Demo auto-login** (`useAuth.loginAsRole`): uses seeded credentials per role; for student/parent (not in users table) creates a fake user + `demo-token`.
4. **Logout**: `invalidateSession` + clear localStorage + redirect `/`.

### 6.2 Demo Credentials (seeded)
| Role | Login | Password |
|------|-------|----------|
| operator | OP001 | 1234 |
| supervisor | SV001 | 3456 |
| admin | AD001 | 1234 |
| sysadmin | SA001 | 1234 |
| parent | PA001 | 1234 |
| student | stu-1 | password |

### 6.3 JWT Payload
```ts
{ uid: user.id, role: user.role, name: user.name }  // HS256, exp 7d
```

---

## 7. STATE MANAGEMENT SEMANTICS (Zustand)

### 7.1 `authStore` (persisted to `localStorage["gate-monitor-auth"]`)
- **State:** `user`, `token`, `role`, `authenticated`, `loading`.
- **Actions:** `login`, `pinLogin`, `logout`, `setRole`, `setLoading`.

### 7.2 `operatorStore` — The Scan Flow State Machine
This is the **heart of the operator UI**. It models the scan lifecycle:

```
idle → detecting → confirming → (selecting_reason) → success
  └────────────── error (auto-reset after 3s) ─────────────┘
```

| State | Meaning |
|-------|---------|
| `idle` | Camera active, waiting for scan. |
| `detecting` | QR detected, resolving student. |
| `confirming` | Student shown; guard picks direction (IN/OUT). |
| `selecting_reason` | If OUT, guard picks exit reason. |
| `success` | Green flash (1s) then auto-reset. |
| `error` | Invalid QR / expired ID / duplicate — shows error, auto-reset after 3s. |

**Key actions:**
- `startScan(roll)` → validates student + ID expiry → infers direction → `confirming`.
- `setDirection(dir)` / `setReason(reason)` → guard input.
- `confirmScan()` → duplicate check → `addScan` → update stats → `success`.
- `cancelScan()` / `reset()` → back to `idle`.
- `setGate(gateId)` → load gate.
- `flushOfflineQueue()` / `setOnline()` → offline mode handling.

**Offline queue:** scans are queued when offline and flushed on reconnect (UI shows "Offline — N scans queued").

### 7.3 `adminStore`
- **State:** `dashboardData`, `alerts`, `unreadNotifications`, `liveActivity` (cap 50), `activeGate`, `loading`.
- **Actions:** `loadDashboard`, `loadAlerts`, `resolveAlert`, `recordScan`.

### 7.4 `uiStore`
- UI state (toasts, modals, etc.).

---

## 8. API ROUTE SEMANTICS (`src/app/api/`)

| Route | Method | Semantics |
|-------|--------|-----------|
| `/api/admin/dashboard` | GET | Returns `DashboardData` (calls `dashboard()`). |
| `/api/alerts` | GET | Returns alerts. |
| `/api/auth/login` | POST | Password login. |
| `/api/auth/logout` | POST | Invalidate session. |
| `/api/auth/pin-login` | POST | Operator PIN login. |
| `/api/auth/session` | GET | Get current session user. |
| `/api/gate/logs` | GET | Gate logs (filterable). |
| `/api/gate/scan` | POST | Record a scan (calls `addScan`). |
| `/api/notifications` | GET | Notifications. |
| `/api/passes` | GET/POST | Gate passes. |
| `/api/passes/[passId]` | GET/PATCH | Single pass. |
| `/api/students` | GET | All students. |
| `/api/students/[roll]` | GET | Single student. |
| `/api/supervisor/corrections` | GET | Correction candidates. |
| `/api/supervisor/live-events` | GET | Live events feed. |

> **Note:** Many routes are thin wrappers over `db.ts`; since several `db.ts` functions are stubs, those endpoints return empty/placeholder data.

---

## 9. COMPONENT SEMANTICS (`src/components/`)

### 9.1 Operator Components (the scanning experience)
| Component | Semantics |
|-----------|-----------|
| `Scanner.tsx` | QR scanner wrapper. |
| `ScanViewfinder.tsx` | Camera viewfinder with animated reticle. |
| `ScanConfirmation.tsx` | Confirmation modal (photo verification → direction → reason). |
| `SuccessFlash.tsx` | Green success overlay after confirm. |
| `ManualEntryDialog.tsx` | Manual roll-number entry (for damaged QR). |
| `LastScanCard.tsx` | Shows most recent scan details. |
| `OperatorStats.tsx` | Today's entries/exits/on-campus counts. |
| `RecentScans.tsx` | Last 5 scans list. |
| `ExitReasonSelector.tsx` | Exit reason buttons (Home Out/Day Out/Leave/Regular). |

### 9.2 Admin Components
| Component | Semantics |
|-----------|-----------|
| `StatCard.tsx` | KPI card (label, value, icon, color). |
| `EntryExitChart.tsx` | Weekly entry/exit bar chart (recharts, hardcoded data). |
| `StudentList.tsx` | Student table. |

### 9.3 Parent Components
| Component | Semantics |
|-----------|-----------|
| `ChildStatus.tsx` | Child's current IN/OUT status badge. |
| `ChildActivity.tsx` | Child's activity timeline. |
| `RequestPassForm.tsx` | Gate pass request form. |

### 9.4 Student Components
| Component | Semantics |
|-----------|-----------|
| `DigitalIdCard.tsx` | Full-screen QR digital ID card. |
| `ActivePasses.tsx` | Student's active gate passes. |
| `RecentActivity.tsx` | Student's recent gate history. |

### 9.5 Supervisor Components
| Component | Semantics |
|-----------|-----------|
| `LiveFeed.tsx` | Real-time gate events feed. |
| `CorrectionsList.tsx` | Editable records (last 1 hr) with audit. |

### 9.6 Sysadmin Components
| Component | Semantics |
|-----------|-----------|
| `GateManagement.tsx` | Configure gates/devices. |
| `UserManagement.tsx` | Manage users/roles. |
| `SystemSettings.tsx` | System configuration. |

### 9.7 Shared / UI Primitives
- `shared/Header.tsx` — top bar (menu, title, bell).
- `shared/Sidebar.tsx` — role-based nav.
- `shared/StatusBadge.tsx` — IN/OUT/exit-reason badge.
- `ui/*` — shadcn-style primitives: `badge`, `button`, `card`, `input`, `modal`, `select`, `skeleton`, `table`, `tabs`, `toast`.

---

## 10. BUSINESS LOGIC SEMANTICS (Rules & Edge Cases)

### 10.1 Scan Validation
1. **Duplicate prevention:** Same student + same direction within 5 min → rejected (`DUPLICATE_SCAN`).
2. **Direction inference:** Last scan IN → next defaults OUT; last OUT → next defaults IN.
3. **Photo verification:** 2-second countdown before guard can confirm (prevents proxy scanning).
4. **Invalid QR:** `INVALID_QR` error → "Please contact administration."
5. **Expired ID:** `EXPIRED_ID` error → "Please renew."

### 10.2 Gate Pass Workflow (scaffolded)
Student requests → Parent approves → Admin approves → Digital pass with QR → Gate scan auto-logs → Pass completed.

### 10.3 Notification Triggers (partially implemented)
- Scan IN/OUT → parent notification (implemented in `addScan`).
- Overdue return, scanner offline, unusual patterns → **not implemented** (stubs).

### 10.4 Offline Mode
- Operator app tracks `isOnline` via browser `online`/`offline` events.
- Offline queue accumulates scans; `flushOfflineQueue` clears on reconnect.
- UI shows "Offline — N scans queued" indicator.

---

## 11. DESIGN SYSTEM SEMANTICS

| Token | Value / Meaning |
|-------|-----------------|
| Font | Inter only |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 |
| Operator theme | Dark bg `#0F172A`, high contrast (outdoor visibility) |
| Admin theme | Dark mode, slate palette |
| Card radius | 12px (16px in some specs) |
| Button radius | 10px |
| Touch targets | Min 48px (tablet) |
| Transitions | 200ms ease |
| CSS vars | `--bg-base`, `--bg-surface`, `--bg-elevated`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--action-primary`, `--action-danger`, `--action-warning`, `--action-info`, `--focus-ring` |

---

## 12. CURRENT IMPLEMENTATION STATUS (Semantic Gap Analysis)

| Feature | Status |
|---------|--------|
| Role selection landing | ✅ Implemented |
| Gate Operator scanning flow | ✅ Implemented (with demo sample rolls) |
| Scan → DB → occupancy → audit → notification | ✅ Implemented |
| Admin dashboard (static KPIs) | ⚠️ Partially (hardcoded data) |
| Admin live dashboard (API-driven) | ⚠️ Scaffolded (db stub) |
| Gate passes workflow | ❌ Stubbed |
| Alerts | ❌ Stubbed |
| Corrections | ❌ Stubbed |
| Supervisor live feed | ⚠️ Partially (LiveFeed calls db) |
| Parent/Student portals | ⚠️ Scaffolded (mostly static) |
| Sysadmin | ⚠️ Scaffolded |
| Login page | ❌ UI stub only (auth via demo auto-login) |
| Offline mode | ⚠️ UI + queue present, flush not persisted |

---

## 13. QUICK-START SEMANTIC CHEAT SHEET

**To understand any page, ask:**
1. **Which role** is it for? (operator/supervisor/admin/sysadmin/parent/student)
2. **What data** does it show? (scans, occupancy, passes, alerts, users)
3. **What action** does it enable? (scan, approve, correct, configure, view)
4. **Which db function** backs it? (addScan, dashboard, statsToday, etc.)

**Core data flow (the one thing that works end-to-end):**
```
QR scan → startScan(roll) → findStudentByRoll → inferDirection
       → confirmScan → isDuplicate → addScan
       → gate_logs INSERT + campus_occupancy UPSERT
       → audit_logs INSERT + notifications INSERT
       → statsToday → UI update (success flash)
```

---

*Document generated from direct source analysis of the `gate-monitor` codebase. All semantics reflect the actual implemented code, not just the design spec.*
````

## File: FIX/supervisor.excalidraw
````
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor",
  "elements": [
    {
      "id": "X6F4Ub14C34EKlRd53mhw",
      "type": "rectangle",
      "x": 701.9731576508916,
      "y": -1822.240057460006,
      "width": 1778.7763744472581,
      "height": 1388.788965968096,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "Zv",
      "roundness": {
        "type": 3
      },
      "seed": 24693587,
      "version": 736,
      "versionNonce": 105528029,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786820575203,
      "link": null,
      "locked": false
    },
    {
      "id": "mn3k6NnrzYX-bCYmYuQZR",
      "type": "rectangle",
      "x": 826.8893800485447,
      "y": -1437.7052001440657,
      "width": 1578.822486769161,
      "height": 167.21464521867028,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "Zy",
      "roundness": {
        "type": 3
      },
      "seed": 843693171,
      "version": 159,
      "versionNonce": 1874008349,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "8YQu02KMtYAQQqaKlEHV9",
          "type": "arrow"
        }
      ],
      "updated": 1786820542683,
      "link": null,
      "locked": false
    },
    {
      "id": "pmZs2R1Ff9H0aFRrn55Vm",
      "type": "rectangle",
      "x": -3680.1119435838827,
      "y": -710.8629282611596,
      "width": 1546.1945241344165,
      "height": 1038.631198007431,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "Zz",
      "roundness": {
        "type": 3
      },
      "seed": 1784119965,
      "version": 222,
      "versionNonce": 2115666163,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820078880,
      "link": null,
      "locked": false
    },
    {
      "id": "4CYejczNq957CHY_ErYZU",
      "type": "rectangle",
      "x": -2934.2657750401113,
      "y": -2679.3854421227966,
      "width": 1122.3519412899157,
      "height": 962.8871507836826,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a1",
      "roundness": {
        "type": 3
      },
      "seed": 1607999293,
      "version": 643,
      "versionNonce": 1322279901,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false
    },
    {
      "id": "ttsXNPyr2sjaGJHXVVX6h",
      "type": "line",
      "x": -2696.829335466795,
      "y": -2676.136223537762,
      "width": 13.33975670338325,
      "height": 965.8506340660132,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a2",
      "roundness": {
        "type": 2
      },
      "seed": 799166931,
      "version": 658,
      "versionNonce": 1604761789,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818954643,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          13.33975670338325,
          965.8506340660132
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": null,
      "endBinding": null,
      "startArrowhead": null,
      "endArrowhead": null
    },
    {
      "id": "NyJwUGrbgm7UxyrvZuUJG",
      "type": "line",
      "x": -2928.12654796487,
      "y": -2532.1746141696717,
      "width": 1118.2373529309775,
      "height": 2.6614202480434144,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a3",
      "roundness": {
        "type": 2
      },
      "seed": 1160459635,
      "version": 607,
      "versionNonce": 417648797,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          1118.2373529309775,
          -2.6614202480434144
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": null,
      "endBinding": null,
      "startArrowhead": null,
      "endArrowhead": null
    },
    {
      "id": "WssdlL1_23k1VdCPNRcue",
      "type": "line",
      "x": -2657.053548222436,
      "y": -2640.215214054968,
      "width": 67.17228773282581,
      "height": 5.05343292496587,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a4",
      "roundness": {
        "type": 2
      },
      "seed": 1895252883,
      "version": 471,
      "versionNonce": 1889187069,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          67.17228773282581,
          5.05343292496587
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": null,
      "endBinding": null,
      "startArrowhead": null,
      "endArrowhead": null
    },
    {
      "id": "RWqCDX7ndC-9ZRx1DRaje",
      "type": "line",
      "x": -2653.020598521413,
      "y": -2617.8625495177193,
      "width": 58.24918242266798,
      "height": 1.4205126477286936,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a5",
      "roundness": {
        "type": 2
      },
      "seed": 2081297277,
      "version": 447,
      "versionNonce": 886377821,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          58.24918242266798,
          1.4205126477286936
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": null,
      "endBinding": null,
      "startArrowhead": null,
      "endArrowhead": null
    },
    {
      "id": "3CX8UP95iSULZioNcCh9B",
      "type": "line",
      "x": -2647.746741220076,
      "y": -2583.035498050992,
      "width": 68.6499474410953,
      "height": 1.600117695142666,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a6",
      "roundness": {
        "type": 2
      },
      "seed": 1173657203,
      "version": 443,
      "versionNonce": 1155881405,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          68.6499474410953,
          1.600117695142666
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": null,
      "endBinding": null,
      "startArrowhead": null,
      "endArrowhead": null
    },
    {
      "id": "ciPzKY_42A9WtglvCt1hU",
      "type": "freedraw",
      "x": -2637.240701435861,
      "y": -2650.7041809454945,
      "width": 119.72150565055554,
      "height": 102.05465265489697,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "a9",
      "roundness": null,
      "seed": 706450077,
      "version": 633,
      "versionNonce": 434969117,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          -0.12298792011715268,
          0
        ],
        [
          -0.40513667803308523,
          0
        ],
        [
          -0.6113223088177907,
          0
        ],
        [
          -0.8663413784725503,
          0
        ],
        [
          -1.7381086945973923,
          0
        ],
        [
          -2.188461519732464,
          0
        ],
        [
          -2.7292466390713193,
          0
        ],
        [
          -3.275457696062371,
          0
        ],
        [
          -4.454694812480189,
          0
        ],
        [
          -5.087720871906956,
          0
        ],
        [
          -6.21993319533885,
          0
        ],
        [
          -6.887323526563021,
          0
        ],
        [
          -7.88027011692098,
          0
        ],
        [
          -8.761080662466183,
          0
        ],
        [
          -9.67263818804072,
          0
        ],
        [
          -10.65654154897832,
          0
        ],
        [
          -11.531926156871325,
          0
        ],
        [
          -12.331347637633105,
          0
        ],
        [
          -13.136195056047125,
          0
        ],
        [
          -13.915721432084053,
          0
        ],
        [
          -14.68982187046874,
          0.07415448124714588
        ],
        [
          -15.561589186593583,
          0.2296980272777156
        ],
        [
          -16.342924208514642,
          0.3924761568445632
        ],
        [
          -17.12245058455157,
          0.4810998051643125
        ],
        [
          -17.99964383832866,
          0.5733407452522246
        ],
        [
          -19.00705959575922,
          0.7505880418917232
        ],
        [
          -20.018092644957946,
          0.9314526302993368
        ],
        [
          -20.777723916270055,
          1.0978480516343947
        ],
        [
          -21.522886020509556,
          1.2606261812012898
        ],
        [
          -22.378375523677715,
          1.4306388943044632
        ],
        [
          -23.123537627917194,
          1.5156452508560496
        ],
        [
          -23.8686997321567,
          1.600651607407636
        ],
        [
          -24.48002204097451,
          1.730874111061114
        ],
        [
          -24.973782367327395,
          1.853862031178362
        ],
        [
          -25.590530613797455,
          2.00759693132485
        ],
        [
          -26.142167608440772,
          2.157714539703176
        ],
        [
          -26.7299775207656,
          2.340387773994871
        ],
        [
          -27.216503263582176,
          2.495931320025488
        ],
        [
          -27.56738056509299,
          2.6333884072152918
        ],
        [
          -27.86761578184969,
          2.7690368485210137
        ],
        [
          -28.095505163243324,
          2.881172893333726
        ],
        [
          -28.305308085796188,
          3.00958675110317
        ],
        [
          -28.446382464754162,
          3.1325746712203704
        ],
        [
          -28.739383097974528,
          3.4165320750203843
        ],
        [
          -29.283785509081522,
          3.881354067228012
        ],
        [
          -29.85531760844969,
          4.36968845592865
        ],
        [
          -30.463022625499367,
          4.966541597673885
        ],
        [
          -31.314894836899363,
          5.812987871421683
        ],
        [
          -32.063674232907026,
          6.559958621545243
        ],
        [
          -32.68946570879747,
          7.274373745755434
        ],
        [
          -33.40388083300766,
          8.077412518285374
        ],
        [
          -34.089357623072615,
          8.76108066246623
        ],
        [
          -34.7748344131376,
          9.357933804211463
        ],
        [
          -35.76597235761148,
          10.432269459352849
        ],
        [
          -36.73540655147646,
          11.4505370920879
        ],
        [
          -37.06277145649428,
          11.902698563107005
        ],
        [
          -37.3829017779758,
          12.3657119094306
        ],
        [
          -37.692180224152885,
          12.819682026333787
        ],
        [
          -37.949007939691754,
          13.360467145672644
        ],
        [
          -38.13348981986753,
          13.904869556779662
        ],
        [
          -38.31616305415925,
          14.66088353632358
        ],
        [
          -38.42468180720385,
          15.588718874854802
        ],
        [
          -38.446385557812775,
          16.686566926489196
        ],
        [
          -38.45723743311721,
          17.952619045342683
        ],
        [
          -38.46085472488537,
          19.372406064342705
        ],
        [
          -38.462663370769455,
          21.07434184125861
        ],
        [
          -38.565756186161806,
          22.799790014667533
        ],
        [
          -38.67065764743825,
          24.700676838831868
        ],
        [
          -38.674274939206384,
          26.585285850039515
        ],
        [
          -38.67608358509046,
          28.272752459882867
        ],
        [
          -38.67608358509046,
          30.112145323988575
        ],
        [
          -38.67608358509046,
          31.95153818809429
        ],
        [
          -38.67608358509046,
          33.790931052200044
        ],
        [
          -38.549478373205126,
          35.36626161723059
        ],
        [
          -37.882088041980914,
          37.3684326109032
        ],
        [
          -36.98680832936307,
          39.43571485640259
        ],
        [
          -35.95407152955542,
          41.132224695666295
        ],
        [
          -34.593969824729946,
          43.23025392119498
        ],
        [
          -31.656728908989816,
          47.328645494512145
        ],
        [
          -30.083206989843326,
          49.383267218822965
        ],
        [
          -28.211258499824197,
          51.56811144678736
        ],
        [
          -25.418709254810196,
          54.61929705322431
        ],
        [
          -22.95714220658216,
          57.082672747336375
        ],
        [
          -20.91698964934394,
          58.9600471750077
        ],
        [
          -18.466274476420367,
          61.398101826742725
        ],
        [
          -16.010133365844574,
          63.722211787780964
        ],
        [
          -13.941042474461145,
          65.77321622032362
        ],
        [
          -12.087180443282735,
          67.61803502208163
        ],
        [
          -10.765060302022919,
          68.91121682919629
        ],
        [
          -9.289205260616516,
          70.47026958127014
        ],
        [
          -7.876652825152819,
          71.88282201673384
        ],
        [
          -7.247244057494214,
          72.70937318575679
        ],
        [
          -6.362816220180851,
          73.7909434244345
        ],
        [
          -4.8037634681069905,
          75.41510742833515
        ],
        [
          -2.5158264247502884,
          77.80251999531605
        ],
        [
          0.2785314661477699,
          79.96927776443964
        ],
        [
          1.4957501461312497,
          80.93328602065237
        ],
        [
          2.7545676814484583,
          81.89729427686508
        ],
        [
          3.924761568445917,
          82.76001836356951
        ],
        [
          5.151023477849757,
          83.68061911856441
        ],
        [
          6.250680175368185,
          84.5668556017619
        ],
        [
          7.2038365562764515,
          85.25052374594277
        ],
        [
          8.028579079415367,
          85.8130126158906
        ],
        [
          8.761080662466277,
          86.35741502699757
        ],
        [
          9.361551095979674,
          86.7860641015237
        ],
        [
          9.92042267415925,
          87.10981171477337
        ],
        [
          10.475676960570755,
          87.42813339037085
        ],
        [
          11.020079371677772,
          87.73741183654789
        ],
        [
          11.653105431104539,
          88.05392486626127
        ],
        [
          13.288121310309625,
          88.83345124229821
        ],
        [
          14.342561860726164,
          89.21869281560649
        ],
        [
          15.496477934766938,
          89.63829866071224
        ],
        [
          16.35739337558729,
          89.92406471039627
        ],
        [
          17.536630492005205,
          90.2170653436167
        ],
        [
          19.15355991236948,
          90.49378816388038
        ],
        [
          20.576964223137665,
          90.71986889938995
        ],
        [
          22.103461349298154,
          90.81753577713009
        ],
        [
          24.026051924071375,
          90.85190004892749
        ],
        [
          25.567018217304515,
          90.85190004892749
        ],
        [
          27.422688894366956,
          90.85190004892749
        ],
        [
          29.746798855405192,
          90.65294900167912
        ],
        [
          32.42178611795426,
          90.06333044347019
        ],
        [
          34.841754310848465,
          89.39774875813008
        ],
        [
          36.9651045787542,
          88.6562039456587
        ],
        [
          39.669030175448476,
          87.52580026811094
        ],
        [
          45.1275234535912,
          84.64824466654534
        ],
        [
          47.78442425729946,
          82.935457014325
        ],
        [
          50.39249162213766,
          81.23713852917719
        ],
        [
          53.00417627874412,
          79.40678889449184
        ],
        [
          55.42776176340649,
          77.62165540690837
        ],
        [
          57.60356276195044,
          76.04451619599371
        ],
        [
          60.794014101461315,
          73.53773300066378
        ],
        [
          61.61513933283197,
          72.85587350236696
        ],
        [
          63.242920628500734,
          71.5717349246727
        ],
        [
          64.93219588422818,
          70.24238019987656
        ],
        [
          66.23442092076324,
          69.11378516821283
        ],
        [
          67.4444050172103,
          67.96348638594021
        ],
        [
          68.74663005374536,
          66.69743426708669
        ],
        [
          70.19535540689058,
          65.25594349747777
        ],
        [
          71.58258679997725,
          63.68423022421539
        ],
        [
          73.0729110084562,
          62.08176997092368
        ],
        [
          74.45652510977469,
          60.378025548123645
        ],
        [
          75.64480545561287,
          58.56033643462681
        ],
        [
          76.69020277660906,
          56.76615971762305
        ],
        [
          77.57463061392241,
          54.93400143705362
        ],
        [
          78.50246595245363,
          52.87214512920646
        ],
        [
          79.25124534846132,
          50.546226522284144
        ],
        [
          79.8788454702358,
          47.956245616286715
        ],
        [
          80.38164902600909,
          45.02081334643064
        ],
        [
          80.64209403331604,
          41.88462138344206
        ],
        [
          80.90977362415941,
          38.53320056024847
        ],
        [
          81.04542206546509,
          35.18177973705482
        ],
        [
          81.04542206546509,
          32.70936081352234
        ],
        [
          80.94775518772498,
          30.264071578250984
        ],
        [
          80.1302472481225,
          26.384526156907054
        ],
        [
          78.97994846584989,
          23.01321022898856
        ],
        [
          77.78262489059125,
          20.488340574817865
        ],
        [
          76.28868339034412,
          17.722921018065012
        ],
        [
          74.76037761829951,
          14.98282250368921
        ],
        [
          73.06386777903585,
          11.77428470533761
        ],
        [
          71.65131534357214,
          9.258458280587273
        ],
        [
          70.23695426222432,
          7.1387253044496655
        ],
        [
          68.79003755496322,
          4.968350243557967
        ],
        [
          67.5420718949505,
          3.2935441549031843
        ],
        [
          66.14941456421165,
          1.6187380662484023
        ],
        [
          64.50716410147024,
          0.05245073063821702
        ],
        [
          62.416369459477885,
          -1.5879910862191142
        ],
        [
          59.99459262069954,
          -3.143426546524859
        ],
        [
          57.44801921591991,
          -4.5614049196407995
        ],
        [
          54.73505038980519,
          -5.979383292756692
        ],
        [
          51.924414685950445,
          -7.133299366797467
        ],
        [
          49.12101356563193,
          -8.283598149070079
        ],
        [
          46.317612445313515,
          -9.31090901122549
        ],
        [
          43.58474851447403,
          -10.05607111546497
        ],
        [
          38.558521602625554,
          -11.005610204605121
        ],
        [
          36.230794349819156,
          -11.114128957649719
        ],
        [
          33.530486044893046,
          -11.159345104751608
        ],
        [
          29.8788300049428,
          -11.179240209476456
        ],
        [
          26.29228521681919,
          -11.188283438896864
        ],
        [
          23.40206909406506,
          -11.19190073066498
        ],
        [
          19.978302435508397,
          -11.19370937654906
        ],
        [
          16.570813589908322,
          -11.195518022433141
        ],
        [
          13.289929956193662,
          -11.197326668317222
        ],
        [
          10.188102265002625,
          -11.199135314201305
        ],
        [
          7.487793960076514,
          -11.200943960085386
        ],
        [
          5.0099490988917905,
          -11.202752605969467
        ],
        [
          2.718394763766926,
          -11.099659790577114
        ],
        [
          0.6221741841223739,
          -10.886239576256083
        ],
        [
          -1.4704291037541108,
          -10.660158840746531
        ],
        [
          -3.3821678032229343,
          -10.332793935728706
        ],
        [
          -5.243264417937573,
          -9.898718923550318
        ],
        [
          -7.391935728220343,
          -9.20962484171722
        ],
        [
          -9.603909644445817,
          -8.307110545563088
        ],
        [
          -11.148493229447121,
          -7.632485630802595
        ],
        [
          -12.372946492966832,
          -6.983181758419143
        ],
        [
          -14.302771651276423,
          -5.966722771568172
        ],
        [
          -16.22174493428152,
          -4.838127739904489
        ],
        [
          -17.422685801308273,
          -4.0477494885630705
        ],
        [
          -18.520533852942663,
          -3.298970092555429
        ],
        [
          -19.54422742332994,
          -2.5302955918229393
        ],
        [
          -20.57334693136943,
          -1.7453432781337652
        ],
        [
          -21.455966122798714,
          -1.0634837798369439
        ],
        [
          -22.056436556312086,
          -0.614939600586001
        ],
        [
          -22.5863698003465,
          -0.12479656600128154
        ],
        [
          -22.908308767712107,
          0.18629052605985788
        ],
        [
          -23.197692109164336,
          0.3544945932789496
        ],
        [
          -23.41834690702165,
          0.5046122016573227
        ],
        [
          -23.506970555341397,
          0.6366433511948822
        ],
        [
          -23.467180345891723,
          0.7035632489057502
        ],
        [
          -23.376748051687898,
          0.7071805406738654
        ],
        [
          -23.259186069222913,
          0.7071805406738654
        ],
        [
          -23.127154919685356,
          0.7071805406738654
        ],
        [
          -23.018636166640757,
          0.7071805406738654
        ],
        [
          -22.91011741359619,
          0.7071805406738654
        ],
        [
          -22.91011741359619,
          0.7071805406738654
        ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
        -109.62042790996486,
        3.383720479418571
      ]
    },
    {
      "id": "9FmjlbMuiPIOgAKvYgAL4",
      "type": "arrow",
      "x": -2560.796921596749,
      "y": -2632.2015816251387,
      "width": 101.90137281005491,
      "height": 136.87537386103034,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aB",
      "roundness": {
        "type": 2
      },
      "seed": 1017213715,
      "version": 452,
      "versionNonce": 215862909,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          101.90137281005491,
          -136.87537386103034
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": null,
      "endBinding": null,
      "startArrowhead": null,
      "endArrowhead": "arrow",
      "elbowed": false
    },
    {
      "id": "VFw4QR-B3gQ75v1VZmzPV",
      "type": "text",
      "x": -2500.818103158185,
      "y": -2791.9230975951477,
      "width": 223.4022953611811,
      "height": 21.64584499159643,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aE",
      "roundness": null,
      "seed": 642652285,
      "version": 560,
      "versionNonce": 1551431389,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "text": "menu bar t open the menu ",
      "fontSize": 17.316675993277133,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "menu bar t open the menu ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "_ysi9CTrvwGgSfVFIe7G6",
      "type": "text",
      "x": -2427.7923218519963,
      "y": -2631.2640199044317,
      "width": 292.0448407129315,
      "height": 41.32869094364936,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aF",
      "roundness": null,
      "seed": 130053107,
      "version": 525,
      "versionNonce": 1934627645,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "text": "current pagetitile ",
      "fontSize": 33.062952754919486,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "current pagetitile ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "4EZtTehDUE2Z7HLmjYkX4",
      "type": "text",
      "x": -2876.083988191757,
      "y": -2495.2382435690624,
      "width": 143.33364064077796,
      "height": 32.94119846888093,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aG",
      "roundness": null,
      "seed": 1737402099,
      "version": 509,
      "versionNonce": 1841603485,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818840937,
      "link": null,
      "locked": false,
      "text": "dashboard ",
      "fontSize": 26.352958775104767,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "dashboard ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "chbaBvCiCV5b3krbn8EkE",
      "type": "ellipse",
      "x": -3242.766700161794,
      "y": -2973.170081042254,
      "width": 1609.564159789345,
      "height": 1622.2333499245365,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aI",
      "roundness": {
        "type": 2
      },
      "seed": 1719205843,
      "version": 180,
      "versionNonce": 1413531155,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818854009,
      "link": null,
      "locked": false
    },
    {
      "id": "gllcWa2ogKGSqxhJtJAwv",
      "type": "text",
      "x": -3071.6358864121235,
      "y": -3113.4240759570266,
      "width": 303.2025602257007,
      "height": 70.53852587056716,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aJ",
      "roundness": null,
      "seed": 746495315,
      "version": 357,
      "versionNonce": 82561757,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818880480,
      "link": null,
      "locked": false,
      "text": "intial page ",
      "fontSize": 56.43082069645372,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "intial page ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "46WxNzymZCMv3g5h2LY9R",
      "type": "text",
      "x": -2752.702563145967,
      "y": -3092.7835914784746,
      "width": 1027.4353048987086,
      "height": 70.53852587056716,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aK",
      "roundness": null,
      "seed": 847009235,
      "version": 207,
      "versionNonce": 776496957,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818880480,
      "link": null,
      "locked": false,
      "text": "http://localhost:3000/supervisor/live",
      "fontSize": 56.43082069645372,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "http://localhost:3000/supervisor/live",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "gcIbj9uFpbrKJXDpJbu0P",
      "type": "text",
      "x": -2517.195155081474,
      "y": -2337.189861064423,
      "width": 594.3150564415783,
      "height": 154.57648062533195,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aL",
      "roundness": null,
      "seed": 1518662749,
      "version": 97,
      "versionNonce": 951346227,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818897481,
      "link": null,
      "locked": false,
      "text": "interface ",
      "fontSize": 123.66118450026563,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "interface ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "b-I9VqPUoJwKs6WTEp9QL",
      "type": "text",
      "x": -2906.444695218596,
      "y": -2620.383403981629,
      "width": 200.3358830947229,
      "height": 46.720143270756225,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aM",
      "roundness": null,
      "seed": 84430099,
      "version": 182,
      "versionNonce": 1237606205,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818911188,
      "link": null,
      "locked": false,
      "text": "________",
      "fontSize": 37.37611461660499,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "________",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "XjviX_-vkJgjOS_9VeZ0E",
      "type": "text",
      "x": -2887.191602006438,
      "y": -2417.0638819928577,
      "width": 162.1603843982381,
      "height": 39.08611021465048,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aN",
      "roundness": null,
      "seed": 114914301,
      "version": 97,
      "versionNonce": 1005999677,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818961117,
      "link": null,
      "locked": false,
      "text": "live FEED ",
      "fontSize": 31.268888171720388,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "live FEED ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "zecqH2GKKSIMZMukh_D0i",
      "type": "text",
      "x": -2899.816697744043,
      "y": -2336.5272121314347,
      "width": 181.05069984567155,
      "height": 41.79382451464517,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aO",
      "roundness": null,
      "seed": 1613776563,
      "version": 181,
      "versionNonce": 1928817661,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818957951,
      "link": null,
      "locked": false,
      "text": "corrections",
      "fontSize": 33.435059611716184,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "corrections",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "WHrVa0iMxvHawMwpehR1A",
      "type": "text",
      "x": -2896.4334225901657,
      "y": -2259.170659627408,
      "width": 174.66661027178864,
      "height": 66.52453340672126,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aP",
      "roundness": null,
      "seed": 809085693,
      "version": 118,
      "versionNonce": 2080285587,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786818975310,
      "link": null,
      "locked": false,
      "text": "critical",
      "fontSize": 53.21962672537699,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "critical",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "sQkUSCvA4qZOew9ScqDK0",
      "type": "text",
      "x": -2914.4665619706684,
      "y": -2123.236558920655,
      "width": 272.83531197245617,
      "height": 32.3356744145065,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aQ",
      "roundness": null,
      "seed": 396291133,
      "version": 281,
      "versionNonce": 2024096051,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819021298,
      "link": null,
      "locked": false,
      "text": "active gate operator ",
      "fontSize": 25.868539531605194,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "active gate operator ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "SKK9LHXCbnAXtvpujOzXk",
      "type": "rectangle",
      "x": -1182.2315473517265,
      "y": -2359.913749613649,
      "width": 3864.7265625,
      "height": 3868.671875,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aR",
      "roundness": {
        "type": 3
      },
      "seed": 639029363,
      "version": 109,
      "versionNonce": 1211008125,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819038719,
      "link": null,
      "locked": false
    },
    {
      "id": "QjBzeGz4RfGtEL9K70kt9",
      "type": "text",
      "x": 29.365950426901122,
      "y": -2855.8324817987113,
      "width": 1479.9984130859375,
      "height": 373.82179028224874,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aT",
      "roundness": null,
      "seed": 1150463805,
      "version": 433,
      "versionNonce": 697906589,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820199457,
      "link": null,
      "locked": false,
      "text": "interfaces",
      "fontSize": 299.057432225799,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "interfaces",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "0t5HHyN7tg8GXP3nnjx9z",
      "type": "text",
      "x": -624.4348549974906,
      "y": -2188.0463070661335,
      "width": 724.9820262161801,
      "height": 115.47250239488989,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aU",
      "roundness": null,
      "seed": 240767165,
      "version": 268,
      "versionNonce": 330519699,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819161087,
      "link": null,
      "locked": false,
      "text": "main dashboard ",
      "fontSize": 92.37800191591184,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "main dashboard ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "Bt7H8dMTdyiTkxL3kbwb5",
      "type": "rectangle",
      "x": -1043.4576569164833,
      "y": -2074.436135843922,
      "width": 1296.8176304443864,
      "height": 1356.165589097269,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aV",
      "roundness": {
        "type": 3
      },
      "seed": 39151293,
      "version": 321,
      "versionNonce": 1225168701,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819151445,
      "link": null,
      "locked": false
    },
    {
      "id": "Lo2CnTguR7KNGR5TZqeT1",
      "type": "ellipse",
      "x": -947.5380114666707,
      "y": -1913.77588734295,
      "width": 263.81861511588,
      "height": 249.09053568858042,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aW",
      "roundness": {
        "type": 2
      },
      "seed": 1451199443,
      "version": 357,
      "versionNonce": 290856083,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819221187,
      "link": null,
      "locked": false
    },
    {
      "id": "TKuxxSpmLckrgQpgP0JEh",
      "type": "ellipse",
      "x": -588.9336064676581,
      "y": -1947.7194225203257,
      "width": 351.65722685446644,
      "height": 334.6907388798459,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aX",
      "roundness": {
        "type": 2
      },
      "seed": 1548498973,
      "version": 291,
      "versionNonce": 336069277,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819190678,
      "link": null,
      "locked": false
    },
    {
      "id": "QYX7LaZSQr4jp5cMsfi2o",
      "type": "ellipse",
      "x": -145.39649317574003,
      "y": -1932.5882209755066,
      "width": 273.8536060913084,
      "height": 273.3886226732663,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aY",
      "roundness": {
        "type": 2
      },
      "seed": 575913821,
      "version": 308,
      "versionNonce": 1756291891,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819224470,
      "link": null,
      "locked": false
    },
    {
      "id": "U28eeYhpuRnpESaUT06Aq",
      "type": "text",
      "x": -904.2391532067716,
      "y": -1617.8503203437938,
      "width": 162.89991760253906,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aZ",
      "roundness": null,
      "seed": 711254589,
      "version": 94,
      "versionNonce": 1668779741,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819248799,
      "link": null,
      "locked": false,
      "text": "home in and out ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "home in and out ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "obDS7IEdaWLYbxLRYEA87",
      "type": "text",
      "x": -485.2404709088074,
      "y": -1594.4288989406443,
      "width": 121.61990356445312,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aa",
      "roundness": null,
      "seed": 1849399475,
      "version": 57,
      "versionNonce": 1978130397,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819291803,
      "link": null,
      "locked": false,
      "text": "dayscholars ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "dayscholars ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "yn-CwdL4_DxWD7c2u1wAi",
      "type": "text",
      "x": -57.7779727766831,
      "y": -1614.3613178917806,
      "width": 84.23995971679688,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ab",
      "roundness": null,
      "seed": 2054231987,
      "version": 83,
      "versionNonce": 541881149,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819308434,
      "link": null,
      "locked": false,
      "text": "day out ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "day out ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "HqxfkX0Qzo_4CNd4FaHRQ",
      "type": "rectangle",
      "x": -927.5062405152845,
      "y": -1519.480525243649,
      "width": 1029.0590114527477,
      "height": 23.503319417838384,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ac",
      "roundness": {
        "type": 3
      },
      "seed": 1346654387,
      "version": 129,
      "versionNonce": 502013949,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819332454,
      "link": null,
      "locked": false
    },
    {
      "id": "ACy2uNr_5cZUrvAJpUEk_",
      "type": "text",
      "x": -505.71506593336505,
      "y": -1454.200291197215,
      "width": 142.65992736816406,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ad",
      "roundness": null,
      "seed": 1461191869,
      "version": 128,
      "versionNonce": 568694579,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819350194,
      "link": null,
      "locked": false,
      "text": "total strength",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "total strength",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "lRF4y7cPxD2bHhsoYGJb3",
      "type": "text",
      "x": -925.0638988722411,
      "y": -1455.8952417535415,
      "width": 18,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ae",
      "roundness": null,
      "seed": 2129686077,
      "version": 26,
      "versionNonce": 1275212829,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819360069,
      "link": null,
      "locked": false,
      "text": "in",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "in",
      "autoResize": false,
      "lineHeight": 1.25
    },
    {
      "id": "DEfu1og1waeIzAJhyoJ1E",
      "type": "text",
      "x": 68.11336723945988,
      "y": -1461.3254595233388,
      "width": 34.019989013671875,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "af",
      "roundness": null,
      "seed": 1112205779,
      "version": 17,
      "versionNonce": 833792883,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819367827,
      "link": null,
      "locked": false,
      "text": "out",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "out",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "NVuRXnQETMneTPY1qK9OE",
      "type": "text",
      "x": -939.2345356550703,
      "y": -1416.7147859468007,
      "width": 62.619964599609375,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ag",
      "roundness": null,
      "seed": 849137149,
      "version": 32,
      "versionNonce": 2008491251,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819376176,
      "link": null,
      "locked": false,
      "text": "count ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "count ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "ITbuMyQM8Q8ICw5dZtgbl",
      "type": "text",
      "x": 58.44986947405414,
      "y": -1425.3573122668852,
      "width": 62.619964599609375,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ah",
      "roundness": null,
      "seed": 1787547965,
      "version": 92,
      "versionNonce": 1004236627,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786819382801,
      "link": null,
      "locked": false,
      "text": "count ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "count ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "xD3U9pLj5CNnMT4XdqMuK",
      "type": "rectangle",
      "x": -1004.0001173497949,
      "y": -1976.0582522264497,
      "width": 1163.0598220499055,
      "height": 377.6084198467138,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ai",
      "roundness": {
        "type": 3
      },
      "seed": 706654237,
      "version": 107,
      "versionNonce": 535469427,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "gb4-zNYl4lcvYDhd05Lii",
          "type": "arrow"
        }
      ],
      "updated": 1786819421672,
      "link": null,
      "locked": false
    },
    {
      "id": "gb4-zNYl4lcvYDhd05Lii",
      "type": "arrow",
      "x": -1008.1919618676288,
      "y": -1613.5200971813301,
      "width": 688.3453542554598,
      "height": 427.271358956059,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aj",
      "roundness": {
        "type": 2
      },
      "seed": 283959699,
      "version": 145,
      "versionNonce": 2066249363,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820137388,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          -688.3453542554598,
          427.271358956059
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": {
        "elementId": "xD3U9pLj5CNnMT4XdqMuK",
        "focus": 0.3453001654847461,
        "gap": 6.809448882383502
      },
      "endBinding": {
        "elementId": "-DGT8RhnNze8O1a2yNAQ3",
        "focus": -0.2462115771152108,
        "gap": 6.612156694921168
      },
      "startArrowhead": null,
      "endArrowhead": "arrow",
      "elbowed": false
    },
    {
      "id": "-DGT8RhnNze8O1a2yNAQ3",
      "type": "text",
      "x": -1980.8033000812015,
      "y": -1180.1294116691365,
      "width": 596.0595703125,
      "height": 75,
      "angle": 6.245067818609117,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ak",
      "roundness": null,
      "seed": 610409651,
      "version": 345,
      "versionNonce": 273684829,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "gb4-zNYl4lcvYDhd05Lii",
          "type": "arrow"
        },
        {
          "id": "nG4iIZAhwBGpLqQhaN_zP",
          "type": "arrow"
        }
      ],
      "updated": 1786820058230,
      "link": null,
      "locked": false,
      "text": "all that diclares that  those interface have shoen indie their\nnumbers nd info graphics whin we press them we shouold \nget individual data about that category information below ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "all that diclares that  those interface have shoen indie their\nnumbers nd info graphics whin we press them we shouold \nget individual data about that category information below ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "hrvzLxMpJ413wdM_b1jUX",
      "type": "rectangle",
      "x": -894.8431115145709,
      "y": -1359.109098508326,
      "width": 1008.3726645798693,
      "height": 426.83572989011736,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "al",
      "roundness": {
        "type": 3
      },
      "seed": 330017437,
      "version": 132,
      "versionNonce": 1677711741,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "WTkY-UT-atKctxmfNBiSS",
          "type": "arrow"
        }
      ],
      "updated": 1786819945167,
      "link": null,
      "locked": false
    },
    {
      "id": "HWKTRCgCcEpPdEtnc3pl9",
      "type": "text",
      "x": -441.8035803107608,
      "y": -1332.108936518534,
      "width": 78.8199462890625,
      "height": 25,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "am",
      "roundness": null,
      "seed": 738286227,
      "version": 63,
      "versionNonce": 1110693171,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786819536613,
      "link": null,
      "locked": false,
      "text": "default ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "default ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "NjdGYEoalfeotwqOwDMQE",
      "type": "text",
      "x": -3119.621654069984,
      "y": -469.80611491021205,
      "width": 721.4195556640625,
      "height": 100,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "an",
      "roundness": null,
      "seed": 1862121341,
      "version": 620,
      "versionNonce": 1005143261,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "nG4iIZAhwBGpLqQhaN_zP",
          "type": "arrow"
        }
      ],
      "updated": 1786820054440,
      "link": null,
      "locked": false,
      "text": "eg: day scholars \nwhen we choose  that we hv to get the detailed ifo avout that category\n people like info evenit contains faculty or any it should be categorised \nand that stuff can be and there is cahnce of ousides can visite in side  ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "eg: day scholars \nwhen we choose  that we hv to get the detailed ifo avout that category\n people like info evenit contains faculty or any it should be categorised \nand that stuff can be and there is cahnce of ousides can visite in side  ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "nG4iIZAhwBGpLqQhaN_zP",
      "type": "arrow",
      "x": -1852.2455209616041,
      "y": -1040.1203731764651,
      "width": 888.1173863764493,
      "height": 567.8440332185172,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ap",
      "roundness": {
        "type": 2
      },
      "seed": 541927091,
      "version": 567,
      "versionNonce": 1831099005,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820058639,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          -888.1173863764493,
          567.8440332185172
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": {
        "elementId": "-DGT8RhnNze8O1a2yNAQ3",
        "focus": 0.02689365291854293,
        "gap": 14
      },
      "endBinding": {
        "elementId": "NjdGYEoalfeotwqOwDMQE",
        "focus": -0.14471130193861992,
        "gap": 2.4702250477358803
      },
      "startArrowhead": null,
      "endArrowhead": "arrow",
      "elbowed": false
    },
    {
      "id": "eh50YC__DyQmq605qjrvl",
      "type": "text",
      "x": -3255.378600970605,
      "y": -236.72694106029599,
      "width": 729.5594482421875,
      "height": 75,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "as",
      "roundness": null,
      "seed": 196952029,
      "version": 324,
      "versionNonce": 443758077,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820054440,
      "link": null,
      "locked": false,
      "text": "all the default data that can be  categorised again cccording to them and\n then those knpi visual if they still if they want to check that category \npeople we can mw ke it eg ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "all the default data that can be  categorised again cccording to them and\n then those knpi visual if they still if they want to check that category \npeople we can mw ke it eg ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "MwZQqQgWmgADm2xiWWX5h",
      "type": "text",
      "x": -3230.629392338897,
      "y": -54.28525893891867,
      "width": 129.61990356445312,
      "height": 100,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "au",
      "roundness": null,
      "seed": 655286301,
      "version": 249,
      "versionNonce": 1911909981,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820054440,
      "link": null,
      "locked": false,
      "text": "day scholars \nboys :\n\ncount ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "day scholars \nboys :\n\ncount ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "BnIAkLPO3qeFEGNbMvZG-",
      "type": "rectangle",
      "x": -3253.5057369467613,
      "y": -71.61065866340641,
      "width": 482.88463629305124,
      "height": 266.12621133187304,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "av",
      "roundness": {
        "type": 3
      },
      "seed": 342976477,
      "version": 194,
      "versionNonce": 558996157,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "WTkY-UT-atKctxmfNBiSS",
          "type": "arrow"
        }
      ],
      "updated": 1786820054440,
      "link": null,
      "locked": false
    },
    {
      "id": "WTkY-UT-atKctxmfNBiSS",
      "type": "arrow",
      "x": -2707.007814921037,
      "y": 58.49975019149497,
      "width": 1780.6943970302727,
      "height": 1151.5903394533573,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "aw",
      "roundness": {
        "type": 2
      },
      "seed": 612771923,
      "version": 615,
      "versionNonce": 1997166291,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820128972,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          921.3540944993524,
          -620.968543300847
        ],
        [
          1780.6943970302727,
          -1151.5903394533573
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": {
        "elementId": "BnIAkLPO3qeFEGNbMvZG-",
        "focus": 0.6851061336798391,
        "gap": 14
      },
      "endBinding": {
        "elementId": "hrvzLxMpJ413wdM_b1jUX",
        "focus": 0.5300796004912064,
        "gap": 31.470306376193548
      },
      "startArrowhead": null,
      "endArrowhead": "arrow",
      "elbowed": false
    },
    {
      "id": "HfaAQrEk2Ivxi7WIQMWQd",
      "type": "text",
      "x": -2874.725618090239,
      "y": -11.621208866724373,
      "width": 67.89996337890625,
      "height": 50,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ax",
      "roundness": null,
      "seed": 627897779,
      "version": 133,
      "versionNonce": 119968893,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786820119247,
      "link": null,
      "locked": false,
      "text": "girls \ncount :",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "girls \ncount :",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "Cto3V0vvluRHjgH-Yyq9N",
      "type": "text",
      "x": -3206.6050655702034,
      "y": 65.73495730728553,
      "width": 174.19992065429688,
      "height": 25,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "ay",
      "roundness": null,
      "seed": 508010195,
      "version": 103,
      "versionNonce": 1776343005,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820054440,
      "link": null,
      "locked": false,
      "text": "_____________",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "_____________",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "s2qAQcEJN6GkPqYhC6vqi",
      "type": "text",
      "x": -3200.3419017157767,
      "y": 113.1254181295335,
      "width": 329.8997802734375,
      "height": 25,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "az",
      "roundness": null,
      "seed": 1060308925,
      "version": 190,
      "versionNonce": 722719805,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820054440,
      "link": null,
      "locked": false,
      "text": "think.  further related data and  ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "think.  further related data and  ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "GMgu7krS1wnRycdarvQXl",
      "type": "text",
      "x": -1925.4985998174475,
      "y": -510.18095307586145,
      "width": 370.3787355483284,
      "height": 56.22023588064575,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "azV",
      "roundness": null,
      "seed": 590836595,
      "version": 610,
      "versionNonce": 804828733,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820136815,
      "link": null,
      "locked": false,
      "text": "example interface for daysholars \nto add hen they choose that kpi ",
      "fontSize": 22.488094352258305,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "example interface for daysholars \nto add hen they choose that kpi ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "B9itZkFllEgEb9snQSxds",
      "type": "text",
      "x": -2981.1331160156833,
      "y": -800.9661716400134,
      "width": 414.23071254533363,
      "height": 57.58966979102989,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b02",
      "roundness": null,
      "seed": 1087634461,
      "version": 91,
      "versionNonce": 1282182365,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820141448,
      "link": null,
      "locked": false,
      "text": "example operation ",
      "fontSize": 46.07173583282388,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "example operation ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "GAEPPXGJeQ24bDbgiMyci",
      "type": "text",
      "x": 1409.08768099945,
      "y": -2212.987411161067,
      "width": 425.2935906151144,
      "height": 114.47403036281274,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b03",
      "roundness": null,
      "seed": 2136702461,
      "version": 75,
      "versionNonce": 521194141,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820184897,
      "link": null,
      "locked": false,
      "text": "live feeed",
      "fontSize": 91.57922429025025,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "live feeed",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "2HtPBUtsyvhbq096Uflbr",
      "type": "text",
      "x": 785.0360126120755,
      "y": -1736.1969438921087,
      "width": 321.7108854418488,
      "height": 92.8586287041135,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b06",
      "roundness": null,
      "seed": 1786849725,
      "version": 176,
      "versionNonce": 512611123,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820426154,
      "link": null,
      "locked": false,
      "text": "sub head",
      "fontSize": 74.2869029632908,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "sub head",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "u3O1SjoCP5yJLYyZUzxVI",
      "type": "text",
      "x": 762.7220523726644,
      "y": -1551.7422342216996,
      "width": 630.7734926696243,
      "height": 57.53567581296684,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b07",
      "roundness": null,
      "seed": 531281171,
      "version": 248,
      "versionNonce": 911647581,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820446050,
      "link": null,
      "locked": false,
      "text": "their in and out live details ",
      "fontSize": 46.02854065037348,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "their in and out live details ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "bboL7LiC-8rCcki5Ar7rj",
      "type": "text",
      "x": 994.8897907058293,
      "y": -1402.5657660306742,
      "width": 78.70866273662595,
      "height": 36.41224878046444,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b08",
      "roundness": null,
      "seed": 870017949,
      "version": 189,
      "versionNonce": 2032098547,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820457543,
      "link": null,
      "locked": false,
      "text": "name ",
      "fontSize": 29.129799024371547,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "name ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "4zRg8PCThDJ8YbttHVH0F",
      "type": "text",
      "x": 1004.8645232595221,
      "y": -1333.1609604592181,
      "width": 90.62276209421584,
      "height": 36.41224878046444,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0C",
      "roundness": null,
      "seed": 1643592189,
      "version": 251,
      "versionNonce": 1142569299,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820458575,
      "link": null,
      "locked": false,
      "text": "roll id ",
      "fontSize": 29.129799024371547,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "roll id ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "ftw4Tsu7T3e7SWz1AAUom",
      "type": "text",
      "x": 2231.4279827641935,
      "y": -1417.3643502413129,
      "width": 144.04675838871637,
      "height": 109.2367463413933,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0D",
      "roundness": null,
      "seed": 423357171,
      "version": 152,
      "versionNonce": 1187807517,
      "isDeleted": false,
      "boundElements": [],
      "updated": 1786820537039,
      "link": null,
      "locked": false,
      "text": "operation \ntime \noerator ",
      "fontSize": 29.129799024371547,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "operation \ntime \noerator ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "uuASPrYNgPCQOWwzA9HFS",
      "type": "text",
      "x": 910.0966270255374,
      "y": -1361.4551298615024,
      "width": 65.13998413085938,
      "height": 25,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0E",
      "roundness": null,
      "seed": 427768445,
      "version": 8,
      "versionNonce": 1400789277,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820463079,
      "link": null,
      "locked": false,
      "text": "photo ",
      "fontSize": 20,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "photo ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "vgxKvG2CBdWQToCQ3oXhm",
      "type": "text",
      "x": 2908.085199123298,
      "y": -1818.2207407610188,
      "width": 1712.00732421875,
      "height": 187.38631126505507,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0F",
      "roundness": null,
      "seed": 557736605,
      "version": 363,
      "versionNonce": 1462676605,
      "isDeleted": false,
      "boundElements": [
        {
          "id": "8YQu02KMtYAQQqaKlEHV9",
          "type": "arrow"
        }
      ],
      "updated": 1786820544839,
      "link": null,
      "locked": false,
      "text": "it should goo to details view about the event \ncoplete log not the raw evrey detail about  ",
      "fontSize": 74.95452450602203,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "it should goo to details view about the event \ncoplete log not the raw evrey detail about  ",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "8YQu02KMtYAQQqaKlEHV9",
      "type": "arrow",
      "x": 2418.33855119533,
      "y": -1418.8780827004293,
      "width": 660.9421972823452,
      "height": 197.95634679553405,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0H",
      "roundness": {
        "type": 2
      },
      "seed": 390040787,
      "version": 141,
      "versionNonce": 620631261,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820544839,
      "link": null,
      "locked": false,
      "points": [
        [
          0,
          0
        ],
        [
          660.9421972823452,
          -197.95634679553405
        ]
      ],
      "lastCommittedPoint": null,
      "startBinding": {
        "elementId": "mn3k6NnrzYX-bCYmYuQZR",
        "focus": 0.5414810611270646,
        "gap": 14
      },
      "endBinding": {
        "elementId": "vgxKvG2CBdWQToCQ3oXhm",
        "focus": 0.28009221779329585,
        "gap": 14
      },
      "startArrowhead": null,
      "endArrowhead": "arrow",
      "elbowed": false
    },
    {
      "id": "yAt4lxO_ibl3c01HBcLb9",
      "type": "text",
      "x": 2131.699964186297,
      "y": -1703.51532836387,
      "width": 126.76306389046026,
      "height": 92.90763341750657,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0I",
      "roundness": null,
      "seed": 2121731347,
      "version": 92,
      "versionNonce": 1819966963,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820581450,
      "link": null,
      "locked": false,
      "text": "filters \n",
      "fontSize": 37.16305336700264,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "filters \n",
      "autoResize": true,
      "lineHeight": 1.25
    },
    {
      "id": "zchzn_mhO4-SmaZiPvNb_",
      "type": "rectangle",
      "x": -684.1512311760071,
      "y": -98.4511343011527,
      "width": 2668.359375,
      "height": 1370.0390625,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0J",
      "roundness": {
        "type": 3
      },
      "seed": 1875510141,
      "version": 143,
      "versionNonce": 1924284947,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820614663,
      "link": null,
      "locked": false
    },
    {
      "id": "ZQnbLkMyctohxW7Z8kaie",
      "type": "text",
      "x": 168.65202223854885,
      "y": -246.8886343011527,
      "width": 1956.147705078125,
      "height": 131.56858421166945,
      "angle": 0,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 4,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "index": "b0K",
      "roundness": null,
      "seed": 661471485,
      "version": 223,
      "versionNonce": 380952573,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1786820674985,
      "link": null,
      "locked": false,
      "text": "like that prepae remaining dahbordas but it shoold polidhd and very detailed\n when they choose u can add any suggestions tothe userabout design  ",
      "fontSize": 52.62743368466778,
      "fontFamily": 5,
      "textAlign": "left",
      "verticalAlign": "top",
      "containerId": null,
      "originalText": "like that prepae remaining dahbordas but it shoold polidhd and very detailed\n when they choose u can add any suggestions tothe userabout design  ",
      "autoResize": true,
      "lineHeight": 1.25
    }
  ],
  "appState": {
    "gridSize": 20,
    "gridStep": 5,
    "gridModeEnabled": false,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
````

## File: FIX/ui.excalidraw
````
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor",
  "elements": [],
  "appState": {
    "gridSize": 20,
    "gridStep": 5,
    "gridModeEnabled": false,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
````

## File: gate/Gate_Monitoring_Master_Prompt.md
````markdown
# ═══════════════════════════════════════════════════════════════════════════════
# PROBLEM 2 — STUDENT GATE MONITORING SYSTEM
# MASTER PROMPT FOR IDE (Copy-Paste Ready)
# College: JNTUH University College of Engineering, Nachupally (Kondagattu)
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# PART A — CONTEXT & REFERENCE DATA
# ═══════════════════════════════════════════════════════════════════════════════

First, visit https://jntuhcej.ac.in/ and extract:
- College name, address, logo, accreditation (NAAC A+)
- All department names and codes (CSE, IT, ECE, EEE, ME)
- Student strength estimates (approximate intake per branch/year)
- Principal and key faculty names
- Use this as the ONLY source of truth for all text content and branding.


# ═══════════════════════════════════════════════════════════════════════════════
# PART B — THE PROBLEM (Visual Explanation for Documentation)
# ═══════════════════════════════════════════════════════════════════════════════

## B.1 Existing Manual Process (What we are replacing)

    ┌─────────────┐
    │   Student   │
    │  approaches │
    │    Gate     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Security  │
    │    Guard    │
    │ asks for ID │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Manual    │
    │   Register  │
    │ (paper book)│
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Handwritten│
    │   Record:   │
    │ Name, Roll, │
    │ Time, Date  │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Storage   │
    │   Room /    │
    │   File Cab. │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Verification│
    │   (manual   │
    │   search)   │
    └─────────────┘

## B.2 Problems with Existing System (Bullet-proof justification)

1. MANUAL ENTRY
   - Guard writes every entry by hand. ~1,500 students × 2 scans/day = 3,000 entries.
   - High cognitive load on security staff.

2. WRITING ERRORS
   - Illegible handwriting, wrong roll numbers, misspelled names.
   - No validation mechanism.

3. DIFFICULT SEARCHING
   - To find if a student left campus yesterday, guard must flip through pages.
   - O(n) search time. No indexing.

4. DIFFICULT HISTORICAL ANALYSIS
   - "How many CSE 3rd year students were absent last Tuesday?" → Impossible to answer quickly.
   - No aggregation, no charts, no trends.

5. PHYSICAL RECORD MANAGEMENT
   - Registers pile up over semesters. Storage space issue.
   - Risk of damage (water, fire, pests).

6. BACKUP DIFFICULTIES
   - No digital copy. If register is lost, data is gone forever.
   - No disaster recovery.

7. TIME-CONSUMING RETRIEVAL
   - Parents call: "Is my child in college?" → Guard must manually search today's register.
   - Peak rush hour: Queue builds up at gate.

8. DIFFICULT REAL-TIME MONITORING
   - Principal has NO idea how many students are currently inside campus.
   - No live dashboard. No alerts for unusual activity.


# ═══════════════════════════════════════════════════════════════════════════════
# PART C — PROPOSED DIGITAL WORKFLOW (Visual)
# ═══════════════════════════════════════════════════════════════════════════════

    ┌─────────────────┐
    │  Student ID Card│
    │  (with printed  │
    │    QR Code)     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   Security Guard│
    │   opens Scanner │
    │   App on Tablet │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │    QR SCAN      │
    │  (Camera reads  │
    │   QR instantly) │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Auto Identify  │
    │  Student from   │
    │   Database      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Guard selects:  │
    │   [ ENTRY ] or  │
    │   [  EXIT  ]    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  If EXIT:       │
    │  Select Reason: │
    │  Home Out /     │
    │  Day Out /      │
    │  Leave /        │
    │  Regular        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Auto Timestamp │
    │  (IST, server   │
    │   synced)       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   Cloud DB      │
    │   (PostgreSQL)  │
    └────────┬────────┘
             │
        ┌────┴────┐
        ▼         ▼
┌─────────────┐ ┌─────────────┐
│ Gate Local  │ │  Parent     │
│ Dashboard   │ │ Notification│
│ (Security)  │ │ (Push/SMS)  │
└─────────────┘ └─────────────┘
        │
        ▼
┌─────────────┐
│  Central    │
│  Admin      │
│  Dashboard  │
│ (Principal) │
└─────────────┘


# ═══════════════════════════════════════════════════════════════════════════════
# PART D — ROLE-BASED ACCESS CONTROL (RBAC)
# ═══════════════════════════════════════════════════════════════════════════════

## D.1 Role Definitions

| # | Role | Description | Device |
|---|------|-------------|--------|
| 1 | Gate Operator | Front-line security staff at each gate. Only scans QR and confirms entry/exit. | Tablet (Android/iOS) |
| 2 | Gate Supervisor | Senior security staff. Can view records, make limited corrections, but cannot access admin analytics. | Tablet / Desktop |
| 3 | Admin (Principal/HOD) | Full monitoring access. Real-time dashboards, reports, alerts, analytics. | Desktop |
| 4 | System Administrator | Technical configuration. Manages gates, devices, users, API keys, backups. | Desktop |

## D.2 Permission Matrix

| Permission | Gate Operator | Gate Supervisor | Admin | SysAdmin |
|-----------|:-------------:|:---------------:|:-----:|:--------:|
| Scan QR Code | ✅ | ✅ | ❌ | ❌ |
| Record Entry/Exit | ✅ | ✅ | ❌ | ❌ |
| View Last Scan | ✅ | ✅ | ✅ | ✅ |
| View Today's Counts | ✅ | ✅ | ✅ | ✅ |
| View Full Gate Logs | ❌ | ✅ (own gate) | ✅ (all) | ✅ (all) |
| Edit/Correct Record | ❌ | ✅ (last 1 hr) | ✅ (any) | ✅ (any) |
| Approve Gate Pass | ❌ | ❌ | ✅ | ❌ |
| View Analytics/Dashboards | ❌ | ❌ | ✅ | ✅ |
| Export Reports | ❌ | ❌ | ✅ | ✅ |
| Manage Users/Roles | ❌ | ❌ | ❌ | ✅ |
| Configure Gates/Devices | ❌ | ❌ | ❌ | ✅ |
| Send Notifications | ❌ | ❌ | ✅ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ✅ |

## D.3 Authentication
- Gate Operator: PIN login (4-digit) + Biometric (fingerprint) on tablet
- Gate Supervisor: Username + Password + 2FA
- Admin: Username + Password + 2FA
- SysAdmin: Username + Password + Hardware Key / 2FA
- Session timeout: 15 mins for Gate Operator, 30 mins for others


# ═══════════════════════════════════════════════════════════════════════════════
# PART E — SCREEN SPECIFICATIONS (UI/UX)
# ═══════════════════════════════════════════════════════════════════════════════

## E.1 DESIGN SYSTEM (Apply to ALL screens)
- Font: Inter ONLY
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- Gate Operator theme: Dark background (#0F172A) for outdoor visibility, high contrast
- Admin theme: Dark mode authority dashboard
- Border radius: 12px for cards, 10px for buttons
- Touch targets: Minimum 48px × 48px for tablet
- Transitions: 200ms ease


## E.2 SCREEN 1 — GATE OPERATOR (ULTRA-SIMPLE)
### Philosophy: ZERO cognitive load. One action at a time.

**Layout:** Full-screen tablet, landscape orientation.

```
┌─────────────────────────────────────────────────────────────┐
│  🏛️ JNTUH-UCoEJ          Gate 1 (Main)     👤 Op #3  🔋85%│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    ┌─────────────────┐                      │
│                    │                 │                      │
│                    │   [ CAMERA      │                      │
│                    │     VIEWFINDER  │                      │
│                    │      HERE ]     │                      │
│                    │                 │                      │
│                    │   Align QR      │                      │
│                    │   within frame  │                      │
│                    │                 │                      │
│                    └─────────────────┘                      │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │   🔲  MANUAL ENTRY      │                    │
│              │      (No QR / Damaged)  │                    │
│              └─────────────────────────┘                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  LAST SCAN                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤  ROLL: 21CSE045                                 │   │
│  │      NAME: K. RAHUL                                 │   │
│  │      DEPT: CSE | 3rd Year                           │   │
│  │      STATUS: 🟢 ENTRY          TIME: 09:12:43 AM    │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  TODAY'S STATS                    [ REFRESH ]              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   ENTRIES   │  │    EXITS    │  │   ON CAMPUS │       │
│  │    1,247    │  │    312      │  │    935      │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│  Recent Scans (last 5)                                     │
│  • 09:12 — 21CSE045 — ENTRY                               │
│  • 09:11 — 21ECE032 — EXIT (Home Out)                     │
│  • 09:10 — 21ME089  — ENTRY                               │
│  • 09:08 — 21IT076  — ENTRY                               │
│  • 09:07 — 21EEE054 — EXIT (Day Out)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Scan Flow:**
1. Camera is ALWAYS active on top half.
2. Guard scans QR → BEEP + VIBRATE + Flash overlay.
3. Bottom half updates instantly with student details.
4. If scan is ambiguous (IN or OUT?), show large toggle:
   ```
   ┌─────────────────────────────────────┐
   │  Is this student ENTERING or EXITING?│
   │                                     │
   │   [ 🟢 ENTERING ]  [ 🔴 EXITING ]   │
   └─────────────────────────────────────┘
   ```
5. If EXITING selected → Show reason buttons (large, full-width):
   ```
   ┌─────────────────────────────────────┐
   │  Select reason for exit:            │
   │                                     │
   │  [ 🏠 HOME OUT ]                    │
   │  [ ☀️ DAY OUT  ]                    │
   │  [ 📝 LEAVE     ]                   │
   │  [ 🚶 REGULAR   ]                   │
   └─────────────────────────────────────┘
   ```
6. On confirm → Green success overlay (1 second) → Auto-reset.

**Manual Entry Mode:**
- Tap "Manual Entry" → Numeric keypad appears → Enter Roll Number → Search → Select student → Proceed as above.
- Requires supervisor PIN for manual entries (audit trail).

**Constraints:**
- NO sidebar navigation.
- NO charts.
- NO tables with more than 5 rows visible.
- NO settings menu.
- NO logout button visible (hidden gesture: triple-tap top-right).


## E.3 SCREEN 2 — SCAN CONFIRMATION OVERLAY
**Full-screen modal after QR scan:**

```
┌─────────────────────────────────────────┐
│                                         │
│         ┌───────────────┐               │
│         │  Student      │               │
│         │  Photo        │               │
│         │  (circular)   │               │
│         └───────────────┘               │
│                                         │
│      K. RAHUL                           │
│      21CSE045                           │
│      CSE — 3rd Year                     │
│                                         │
│      Last Status: OUT at 4:30 PM        │
│                                         │
│      ┌─────────────────────────┐        │
│      │   🟢 CONFIRM ENTRY      │        │
│      └─────────────────────────┘        │
│                                         │
│      ┌─────────────────────────┐        │
│      │   🔴 CONFIRM EXIT       │        │
│      └─────────────────────────┘        │
│                                         │
│              [ CANCEL ]                 │
│                                         │
└─────────────────────────────────────────┘
```

**Rules:**
- If last status was OUT and guard taps ENTRY → Direct confirm.
- If last status was IN and guard taps EXIT → Show reason selector.
- If same scan within 30 seconds → "Already recorded. Duplicate scan ignored."
- Photo verification: Show student photo for 3 seconds before allowing confirm (prevents proxy scanning).


## E.4 SCREEN 3 — GATE SUPERVISOR VIEW
**Layout:** Tablet/Desktop, more information density allowed.

**Tabs:** [Live Gate] | [Today's Logs] | [Corrections] | [Gate Passes]

**Tab 1 — Live Gate:**
- Same as Gate Operator but with additional info:
  - "Current Shift: 6 AM — 2 PM"
  - "Operator on duty: Guard #3"
  - "Scanner status: Online 🟢"

**Tab 2 — Today's Logs:**
- Full table: Time | Roll No | Name | Direction | Reason | Gate | Operator | Action
- Search by roll number or name.
- Filter: All | Entry | Exit | Home Out | Day Out | Leave
- Export today's log as PDF (for shift handover).

**Tab 3 — Corrections:**
- List of records editable within last 1 hour.
- Each row: Original data → [Edit] → Form → Save (requires reason for edit).
- Audit trail: Who edited, when, why.

**Tab 4 — Gate Passes:**
- Pending gate pass requests for this gate.
- Approve/Reject with comment.


## E.5 SCREEN 4 — ADMIN DASHBOARD (Full Authority)
**Layout:** Desktop, dark mode, data-dense.

**Top Navigation:**
- Logo | Gate Monitor | Attendance | Students | Reports | Alerts | Settings

**Section 1 — Executive KPIs (4 cards)**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 👥 ON CAMPUS │ │ 📤 TODAY OUT │ │ 📊 SCANS     │ │ ⚠️ ALERTS    │
│    1,247     │ │    312       │ │   1,559      │ │     3        │
│  🟢 +12 vs   │ │  🔴 +45 vs   │ │  🟡 Normal   │ │  🔴 Critical │
│   yesterday  │ │  yesterday   │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Section 2 — Live Campus Map (Visual)**
- SVG/Canvas campus layout.
- Gate 1 (Main): 1,247 students passed
- Gate 2 (Hostel): 892 students passed
- Library: 456 currently inside
- Canteen: 234 currently inside
- Each location: Pulse dot (green = active, red = alert).

**Section 3 — Real-Time Activity Feed**
- Scrollable list, auto-updating every 5 seconds.
- Format: "[TIME] [AVATAR] [NAME] [ROLL] [ACTION] [GATE]"
- Color coding:
  - Green border-left = ENTRY
  - Red border-left = EXIT (Home Out)
  - Orange border-left = EXIT (Day Out)
  - Blue border-left = EXIT (Leave)

**Section 4 — Department Breakdown**
- Horizontal bar chart: Dept | Students IN | Students OUT | % On Campus
- CSE: ████████████ 312 IN | 45 OUT | 87%
- ECE: ██████████   278 IN | 38 OUT | 88%
- (etc.)

**Section 5 — Alerts Panel**
- Critical: "Student 21CSE045 requested Home Out at 4 PM. Has NOT returned. Expected by 8 PM."
- Warning: "Gate 2 scanner offline for 5 minutes."
- Info: "Shift change at Gate 1 — 2 PM"

**Section 6 — Gate Pass Management**
- Table: Student | Roll | Reason | From | To | Requested By | Status | Actions
- Bulk approve/reject.
- Auto-approve rules (e.g., Day Out < 6 hours = auto-approve if parent consented).


## E.6 SCREEN 5 — PARENT NOTIFICATION (Mobile)
**Push Notification:**
```
┌─────────────────────────────────────────┐
│  🏛️ JNTUH-UCoEJ                        │
│                                         │
│  Your ward K. RAHUL (21CSE045)          │
│  has LEFT the campus.                   │
│                                         │
│  Reason: Home Out                       │
│  Time: 04:30 PM                         │
│  Expected Return: Tomorrow 8:00 AM      │
│                                         │
│  [ VIEW DETAILS ]                       │
└─────────────────────────────────────────┘
```

**Parent App Screen:**
- Child card: Photo, Name, Roll, Dept, Current Status (🟢 IN / 🔴 OUT)
- Today's Timeline: Vertical line with dots
  - 8:00 AM — ENTRY
  - 4:30 PM — EXIT (Home Out)
- Weekly summary: Bar chart of entry/exit times
- Gate Pass Requests: Approve/Reject buttons


## E.7 SCREEN 6 — STUDENT MOBILE APP
**Digital ID Card:**
- Full-screen QR code (auto-max brightness when opened)
- Student photo, name, roll, dept, valid until date
- Below QR: "Show this at gate for scanning"

**My Gate History:**
- Calendar view with color dots
- Green = Entry, Red = Exit
- Tap any day → Detailed log

**Request Gate Pass:**
- Form: Reason (dropdown) | From Date/Time | To Date/Time | Description
- Submit → Goes to Admin + Parent
- Track status: Pending / Approved / Rejected


# ═══════════════════════════════════════════════════════════════════════════════
# PART F — BUSINESS LOGIC & EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

## F.1 Scan Validation Rules
1. **Duplicate Prevention:** Same student cannot be scanned IN twice within 5 minutes. Same for OUT.
2. **Direction Logic:**
   - If last record is IN → Next scan defaults to OUT.
   - If last record is OUT → Next scan defaults to IN.
   - Guard can override with confirmation.
3. **Photo Verification:** Display student photo for 2 seconds before allowing confirm (prevents proxy/fake ID).
4. **Invalid QR:** If QR not in database → Red error: "Invalid ID. Please contact administration."
5. **Expired ID:** If ID validity expired → Orange warning: "ID expired. Please renew."

## F.2 Gate Pass Workflow
1. Student requests via app → Status: PENDING
2. Parent receives notification → Can approve/reject
3. If parent approves → Goes to Admin for final approval
4. If both approve → Student gets digital gate pass with QR
5. At gate: Guard scans pass QR → Auto-allows exit with reason pre-filled
6. Return: Student scans at gate → Auto-logs entry, closes pass

## F.3 Notification Triggers
| Event | Recipient | Channel |
|-------|-----------|---------|
| Student EXIT (Home Out) | Parent | Push + SMS |
| Student EXIT (Day Out) | Parent | Push + SMS |
| Student EXIT (Leave) | Parent | Push + SMS |
| Student ENTRY | Parent | Push (silent) |
| Gate Pass Request | Parent + Admin | Push + Email |
| Student not returned (overdue) | Parent + Admin | Push + SMS |
| Gate scanner offline > 5 min | Admin + Supervisor | Push + Email |
| Unusual scan pattern (3+ exits/day) | Admin | Email |

## F.4 Offline Mode
- Gate Operator app works offline for up to 2 hours.
- Scans stored locally (IndexedDB).
- Auto-sync when connection restored.
- Visual indicator: "Offline Mode — 12 scans queued"

## F.5 Audit Trail
Every action logged:
- Who (user ID)
- What (action type)
- When (timestamp)
- Where (gate ID, device ID)
- Why (reason for manual entry/correction)


# ═══════════════════════════════════════════════════════════════════════════════
# PART G — ADDITIONAL SUGGESTIONS (Beyond User Requirements)
# ═══════════════════════════════════════════════════════════════════════════════

1. **Multi-Gate Support:**
   - Gate 1: Main Entrance (all students)
   - Gate 2: Hostel Gate (hostel students only)
   - Gate 3: Back Gate (staff/visitors)
   - Each gate has independent operator + supervisor.

2. **Visitor Management:**
   - Non-student QR (visitor pass) → Logs separately → Notify host faculty.

3. **Late Entry Flagging:**
   - If student enters after 9:30 AM → Auto-flag as "Late Entry" → Notify HOD.

4. **Batch Operations:**
   - During events (symposiums), allow "Event Mode" → Bulk scan without individual confirmation.

5. **Emergency Mode:**
   - One-tap emergency lockdown → All gates switch to ENTRY-only → Alert all security.

6. **Biometric Backup:**
   - If QR damaged AND manual entry fails → Fingerprint scan (for enrolled students).

7. **Bus Tracking Integration:**
   - If student exits for bus → Track bus departure → Notify parent when bus leaves.

8. **Night Out Curfew:**
   - Hostel students: Auto-alert if not returned by 9 PM.

9. **Parent Geo-Fencing (Optional):**
   - Notify parent when student reaches home (GPS-based, opt-in).

10. **AI Anomaly Detection:**
    - "Student X has exited 5 times this week vs usual 1 time."
    - "Student Y entered campus but no attendance marked for 3 periods."


# ═══════════════════════════════════════════════════════════════════════════════
# PART H — MASTER PROMPT FOR IDE (COPY THIS ENTIRE BLOCK)
# ═══════════════════════════════════════════════════════════════════════════════

You are building a Student Gate Monitoring System for JNTUH University College of Engineering, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501.

STEP 1 — REFERENCE DATA:
Visit https://jntuhcej.ac.in/ and extract all college details: name, address, logo, NAAC A+ badge, departments (CSE, IT, ECE, EEE, ME), principal name (Dr. G. Narsimha), contact info. Use ONLY this data for all text content.

STEP 2 — PROBLEM CONTEXT (Build this as documentation/visuals in the app):
Show the existing manual process visually: Student → Gate → Security Guard → Manual Register → Storage → Verification. Then list the 8 problems: Manual Entry, Writing Errors, Difficult Searching, Difficult Historical Analysis, Physical Record Management, Backup Difficulties, Time-Consuming Retrieval, Difficult Real-Time Monitoring.

STEP 3 — PROPOSED WORKFLOW (Visual):
Show the new digital flow: Student ID Card → QR Scan → Student Identification → Entry/Exit Selection → Timestamp → Database → Gate Dashboard → Central Admin Dashboard + Parent Notification.

STEP 4 — ROLE-BASED ACCESS:
Implement 4 roles with strict permissions:
- Gate Operator: Scan QR, record entry/exit, view last scan + today's counts. NOTHING ELSE.
- Gate Supervisor: View gate records, limited corrections (last 1 hour only), view gate passes.
- Admin: Full monitoring, analytics, reports, alerts, gate pass approvals.
- System Administrator: User management, device configuration, API keys, backups.

STEP 5 — DESIGN SYSTEM (STRICT):
- Font: Inter ONLY.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Gate Operator screen: Dark background (#0F172A) for outdoor visibility, high contrast white text.
- Admin dashboard: Dark mode, slate color palette.
- Touch targets: Minimum 48px for tablet.
- Buttons: 44px height, 10px radius, 14px/600 font.
- Cards: 16px radius, 24px padding.
- NO random values. NO cluttered dashboards for operators.

STEP 6 — BUILD THESE SCREENS:

A. GATE OPERATOR SCREEN (ULTRA-SIMPLE):
- Top bar: College name, Gate name, Operator ID, battery.
- Center: Large camera viewfinder (60% of screen). Always active.
- Below camera: "Manual Entry" button (for damaged QR).
- Bottom: Last scan card (student photo, name, roll, status, time).
- Stats row: Today's Entries | Today's Exits | Currently On Campus.
- Recent scans list: Last 5 scans only.
- On QR scan: Show confirmation overlay with student photo, name, roll, last status. Two big buttons: [CONFIRM ENTRY] [CONFIRM EXIT]. If EXIT: show reason buttons [HOME OUT] [DAY OUT] [LEAVE] [REGULAR].
- After confirm: Green success flash (1s) → auto-reset.
- Manual entry: Numeric keypad → enter roll → search → select → proceed.
- Triple-tap top-right for hidden logout.

B. GATE SUPERVISOR SCREEN:
- Tabs: Live Gate | Today's Logs | Corrections | Gate Passes.
- Live Gate: Same as operator + shift info + scanner status.
- Today's Logs: Full searchable table with filters. Export PDF.
- Corrections: Editable records (last 1 hour only). Audit trail.
- Gate Passes: Approve/reject requests.

C. ADMIN DASHBOARD:
- KPI cards: On Campus, Today Out, Total Scans, Active Alerts.
- Live campus map with location counters and pulse dots.
- Real-time activity feed (auto-refresh every 5s, color-coded).
- Department breakdown bar chart.
- Alerts panel (Critical/Warning/Info).
- Gate pass management table with bulk actions.

D. PARENT NOTIFICATION:
- Push notification: "Your ward [Name] ([Roll]) has LEFT campus. Reason: [X]. Time: [X]. Expected return: [X]."
- Parent app: Child status badge, timeline, weekly chart, gate pass approve/reject.

E. STUDENT MOBILE APP:
- Digital ID: Full-screen QR, auto-max brightness.
- Gate pass request form.
- Personal gate history calendar.

STEP 7 — BUSINESS LOGIC:
- Duplicate scan prevention (5-minute cooldown).
- Direction auto-detection based on last record.
- Photo verification (2-second display before confirm).
- Invalid QR / Expired ID error handling.
- Gate pass: Student request → Parent approval → Admin approval → Digital pass → Gate scan → Auto-log.
- Offline mode: 2-hour local storage, auto-sync.
- Full audit trail for every action.

STEP 8 — NOTIFICATIONS:
- Student EXIT → Parent gets Push + SMS.
- Overdue return → Parent + Admin alerted.
- Scanner offline > 5 min → Admin alerted.
- Unusual pattern → Admin email.

STEP 9 — RESPONSIVE:
- Gate Operator: Tablet landscape (optimized for 10-inch Android tablet).
- Gate Supervisor: Tablet landscape or desktop.
- Admin: Desktop primary, tablet adaptable.
- Parent/Student: Mobile-first.

STEP 10 — PERFORMANCE:
- Camera scan must feel instant (< 500ms from scan to identification).
- Dashboard data refreshes every 5 seconds via WebSockets.
- Skeleton loaders for data fetch.
- Optimistic UI for scan confirmations.

Build this as a Next.js application with TypeScript, Tailwind CSS, and shadcn/ui. Use Framer Motion for the scan success animations. Use Zustand for local state. The Gate Operator screen must feel like a dedicated hardware device — minimal, fast, zero distractions.
````

## File: gate-monitor/.git/gk/config
````
[branch "main"]
	gk-last-accessed = 2026-08-16T10:08:01.433Z
	gk-last-modified = 2026-08-15T13:46:24.426Z
````

## File: gate-monitor/.git/hooks/applypatch-msg.sample
````
#!/bin/sh
#
# An example hook script to check the commit log message taken by
# applypatch from an e-mail message.
#
# The hook should exit with non-zero status after issuing an
# appropriate message if it wants to stop the commit.  The hook is
# allowed to edit the commit message file.
#
# To enable this hook, rename this file to "applypatch-msg".

. git-sh-setup
commitmsg="$(git rev-parse --git-path hooks/commit-msg)"
test -x "$commitmsg" && exec "$commitmsg" ${1+"$@"}
:
````

## File: gate-monitor/.git/hooks/commit-msg.sample
````
#!/bin/sh
#
# An example hook script to check the commit log message.
# Called by "git commit" with one argument, the name of the file
# that has the commit message.  The hook should exit with non-zero
# status after issuing an appropriate message if it wants to stop the
# commit.  The hook is allowed to edit the commit message file.
#
# To enable this hook, rename this file to "commit-msg".

# Uncomment the below to add a Signed-off-by line to the message.
# Doing this in a hook is a bad idea in general, but the prepare-commit-msg
# hook is more suited to it.
#
# SOB=$(git var GIT_AUTHOR_IDENT | sed -n 's/^\(.*>\).*$/Signed-off-by: \1/p')
# grep -qs "^$SOB" "$1" || echo "$SOB" >> "$1"

# This example catches duplicate Signed-off-by lines.

test "" = "$(grep '^Signed-off-by: ' "$1" |
	 sort | uniq -c | sed -e '/^[ 	]*1[ 	]/d')" || {
	echo >&2 Duplicate Signed-off-by lines.
	exit 1
}
````

## File: gate-monitor/.git/hooks/fsmonitor-watchman.sample
````
#!/usr/bin/perl

use strict;
use warnings;
use IPC::Open2;

# An example hook script to integrate Watchman
# (https://facebook.github.io/watchman/) with git to speed up detecting
# new and modified files.
#
# The hook is passed a version (currently 2) and last update token
# formatted as a string and outputs to stdout a new update token and
# all files that have been modified since the update token. Paths must
# be relative to the root of the working tree and separated by a single NUL.
#
# To enable this hook, rename this file to "query-watchman" and set
# 'git config core.fsmonitor .git/hooks/query-watchman'
#
my ($version, $last_update_token) = @ARGV;

# Uncomment for debugging
# print STDERR "$0 $version $last_update_token\n";

# Check the hook interface version
if ($version ne 2) {
	die "Unsupported query-fsmonitor hook version '$version'.\n" .
	    "Falling back to scanning...\n";
}

my $git_work_tree = get_working_dir();

my $retry = 1;

my $json_pkg;
eval {
	require JSON::XS;
	$json_pkg = "JSON::XS";
	1;
} or do {
	require JSON::PP;
	$json_pkg = "JSON::PP";
};

launch_watchman();

sub launch_watchman {
	my $o = watchman_query();
	if (is_work_tree_watched($o)) {
		output_result($o->{clock}, @{$o->{files}});
	}
}

sub output_result {
	my ($clockid, @files) = @_;

	# Uncomment for debugging watchman output
	# open (my $fh, ">", ".git/watchman-output.out");
	# binmode $fh, ":utf8";
	# print $fh "$clockid\n@files\n";
	# close $fh;

	binmode STDOUT, ":utf8";
	print $clockid;
	print "\0";
	local $, = "\0";
	print @files;
}

sub watchman_clock {
	my $response = qx/watchman clock "$git_work_tree"/;
	die "Failed to get clock id on '$git_work_tree'.\n" .
		"Falling back to scanning...\n" if $? != 0;

	return $json_pkg->new->utf8->decode($response);
}

sub watchman_query {
	my $pid = open2(\*CHLD_OUT, \*CHLD_IN, 'watchman -j --no-pretty')
	or die "open2() failed: $!\n" .
	"Falling back to scanning...\n";

	# In the query expression below we're asking for names of files that
	# changed since $last_update_token but not from the .git folder.
	#
	# To accomplish this, we're using the "since" generator to use the
	# recency index to select candidate nodes and "fields" to limit the
	# output to file names only. Then we're using the "expression" term to
	# further constrain the results.
	my $last_update_line = "";
	if (substr($last_update_token, 0, 1) eq "c") {
		$last_update_token = "\"$last_update_token\"";
		$last_update_line = qq[\n"since": $last_update_token,];
	}
	my $query = <<"	END";
		["query", "$git_work_tree", {$last_update_line
			"fields": ["name"],
			"expression": ["not", ["dirname", ".git"]]
		}]
	END

	# Uncomment for debugging the watchman query
	# open (my $fh, ">", ".git/watchman-query.json");
	# print $fh $query;
	# close $fh;

	print CHLD_IN $query;
	close CHLD_IN;
	my $response = do {local $/; <CHLD_OUT>};

	# Uncomment for debugging the watch response
	# open ($fh, ">", ".git/watchman-response.json");
	# print $fh $response;
	# close $fh;

	die "Watchman: command returned no output.\n" .
	"Falling back to scanning...\n" if $response eq "";
	die "Watchman: command returned invalid output: $response\n" .
	"Falling back to scanning...\n" unless $response =~ /^\{/;

	return $json_pkg->new->utf8->decode($response);
}

sub is_work_tree_watched {
	my ($output) = @_;
	my $error = $output->{error};
	if ($retry > 0 and $error and $error =~ m/unable to resolve root .* directory (.*) is not watched/) {
		$retry--;
		my $response = qx/watchman watch "$git_work_tree"/;
		die "Failed to make watchman watch '$git_work_tree'.\n" .
		    "Falling back to scanning...\n" if $? != 0;
		$output = $json_pkg->new->utf8->decode($response);
		$error = $output->{error};
		die "Watchman: $error.\n" .
		"Falling back to scanning...\n" if $error;

		# Uncomment for debugging watchman output
		# open (my $fh, ">", ".git/watchman-output.out");
		# close $fh;

		# Watchman will always return all files on the first query so
		# return the fast "everything is dirty" flag to git and do the
		# Watchman query just to get it over with now so we won't pay
		# the cost in git to look up each individual file.
		my $o = watchman_clock();
		$error = $output->{error};

		die "Watchman: $error.\n" .
		"Falling back to scanning...\n" if $error;

		output_result($o->{clock}, ("/"));
		$last_update_token = $o->{clock};

		eval { launch_watchman() };
		return 0;
	}

	die "Watchman: $error.\n" .
	"Falling back to scanning...\n" if $error;

	return 1;
}

sub get_working_dir {
	my $working_dir;
	if ($^O =~ 'msys' || $^O =~ 'cygwin') {
		$working_dir = Win32::GetCwd();
		$working_dir =~ tr/\\/\//;
	} else {
		require Cwd;
		$working_dir = Cwd::cwd();
	}

	return $working_dir;
}
````

## File: gate-monitor/.git/hooks/post-update.sample
````
#!/bin/sh
#
# An example hook script to prepare a packed repository for use over
# dumb transports.
#
# To enable this hook, rename this file to "post-update".

exec git update-server-info
````

## File: gate-monitor/.git/hooks/pre-applypatch.sample
````
#!/bin/sh
#
# An example hook script to verify what is about to be committed
# by applypatch from an e-mail message.
#
# The hook should exit with non-zero status after issuing an
# appropriate message if it wants to stop the commit.
#
# To enable this hook, rename this file to "pre-applypatch".

. git-sh-setup
precommit="$(git rev-parse --git-path hooks/pre-commit)"
test -x "$precommit" && exec "$precommit" ${1+"$@"}
:
````

## File: gate-monitor/.git/hooks/pre-commit.sample
````
#!/bin/sh
#
# An example hook script to verify what is about to be committed.
# Called by "git commit" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message if
# it wants to stop the commit.
#
# To enable this hook, rename this file to "pre-commit".

if git rev-parse --verify HEAD >/dev/null 2>&1
then
	against=HEAD
else
	# Initial commit: diff against an empty tree object
	against=$(git hash-object -t tree /dev/null)
fi

# If you want to allow non-ASCII filenames set this variable to true.
allownonascii=$(git config --type=bool hooks.allownonascii)

# Redirect output to stderr.
exec 1>&2

# Cross platform projects tend to avoid non-ASCII filenames; prevent
# them from being added to the repository. We exploit the fact that the
# printable range starts at the space character and ends with tilde.
if [ "$allownonascii" != "true" ] &&
	# Note that the use of brackets around a tr range is ok here, (it's
	# even required, for portability to Solaris 10's /usr/bin/tr), since
	# the square bracket bytes happen to fall in the designated range.
	test $(git diff-index --cached --name-only --diff-filter=A -z $against |
	  LC_ALL=C tr -d '[ -~]\0' | wc -c) != 0
then
	cat <<\EOF
Error: Attempt to add a non-ASCII file name.

This can cause problems if you want to work with people on other platforms.

To be portable it is advisable to rename the file.

If you know what you are doing you can disable this check using:

  git config hooks.allownonascii true
EOF
	exit 1
fi

# If there are whitespace errors, print the offending file names and fail.
exec git diff-index --check --cached $against --
````

## File: gate-monitor/.git/hooks/pre-merge-commit.sample
````
#!/bin/sh
#
# An example hook script to verify what is about to be committed.
# Called by "git merge" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message to
# stderr if it wants to stop the merge commit.
#
# To enable this hook, rename this file to "pre-merge-commit".

. git-sh-setup
test -x "$GIT_DIR/hooks/pre-commit" &&
        exec "$GIT_DIR/hooks/pre-commit"
:
````

## File: gate-monitor/.git/hooks/pre-push.sample
````
#!/bin/sh

# An example hook script to verify what is about to be pushed.  Called by "git
# push" after it has checked the remote status, but before anything has been
# pushed.  If this script exits with a non-zero status nothing will be pushed.
#
# This hook is called with the following parameters:
#
# $1 -- Name of the remote to which the push is being done
# $2 -- URL to which the push is being done
#
# If pushing without using a named remote those arguments will be equal.
#
# Information about the commits which are being pushed is supplied as lines to
# the standard input in the form:
#
#   <local ref> <local oid> <remote ref> <remote oid>
#
# This sample shows how to prevent push of commits where the log message starts
# with "WIP" (work in progress).

remote="$1"
url="$2"

zero=$(git hash-object --stdin </dev/null | tr '[0-9a-f]' '0')

while read local_ref local_oid remote_ref remote_oid
do
	if test "$local_oid" = "$zero"
	then
		# Handle delete
		:
	else
		if test "$remote_oid" = "$zero"
		then
			# New branch, examine all commits
			range="$local_oid"
		else
			# Update to existing branch, examine new commits
			range="$remote_oid..$local_oid"
		fi

		# Check for WIP commit
		commit=$(git rev-list -n 1 --grep '^WIP' "$range")
		if test -n "$commit"
		then
			echo >&2 "Found WIP commit in $local_ref, not pushing"
			exit 1
		fi
	fi
done

exit 0
````

## File: gate-monitor/.git/hooks/pre-rebase.sample
````
#!/bin/sh
#
# Copyright (c) 2006, 2008 Junio C Hamano
#
# The "pre-rebase" hook is run just before "git rebase" starts doing
# its job, and can prevent the command from running by exiting with
# non-zero status.
#
# The hook is called with the following parameters:
#
# $1 -- the upstream the series was forked from.
# $2 -- the branch being rebased (or empty when rebasing the current branch).
#
# This sample shows how to prevent topic branches that are already
# merged to 'next' branch from getting rebased, because allowing it
# would result in rebasing already published history.

publish=next
basebranch="$1"
if test "$#" = 2
then
	topic="refs/heads/$2"
else
	topic=`git symbolic-ref HEAD` ||
	exit 0 ;# we do not interrupt rebasing detached HEAD
fi

case "$topic" in
refs/heads/??/*)
	;;
*)
	exit 0 ;# we do not interrupt others.
	;;
esac

# Now we are dealing with a topic branch being rebased
# on top of master.  Is it OK to rebase it?

# Does the topic really exist?
git show-ref -q "$topic" || {
	echo >&2 "No such branch $topic"
	exit 1
}

# Is topic fully merged to master?
not_in_master=`git rev-list --pretty=oneline ^master "$topic"`
if test -z "$not_in_master"
then
	echo >&2 "$topic is fully merged to master; better remove it."
	exit 1 ;# we could allow it, but there is no point.
fi

# Is topic ever merged to next?  If so you should not be rebasing it.
only_next_1=`git rev-list ^master "^$topic" ${publish} | sort`
only_next_2=`git rev-list ^master           ${publish} | sort`
if test "$only_next_1" = "$only_next_2"
then
	not_in_topic=`git rev-list "^$topic" master`
	if test -z "$not_in_topic"
	then
		echo >&2 "$topic is already up to date with master"
		exit 1 ;# we could allow it, but there is no point.
	else
		exit 0
	fi
else
	not_in_next=`git rev-list --pretty=oneline ^${publish} "$topic"`
	/usr/bin/perl -e '
		my $topic = $ARGV[0];
		my $msg = "* $topic has commits already merged to public branch:\n";
		my (%not_in_next) = map {
			/^([0-9a-f]+) /;
			($1 => 1);
		} split(/\n/, $ARGV[1]);
		for my $elem (map {
				/^([0-9a-f]+) (.*)$/;
				[$1 => $2];
			} split(/\n/, $ARGV[2])) {
			if (!exists $not_in_next{$elem->[0]}) {
				if ($msg) {
					print STDERR $msg;
					undef $msg;
				}
				print STDERR " $elem->[1]\n";
			}
		}
	' "$topic" "$not_in_next" "$not_in_master"
	exit 1
fi

<<\DOC_END

This sample hook safeguards topic branches that have been
published from being rewound.

The workflow assumed here is:

 * Once a topic branch forks from "master", "master" is never
   merged into it again (either directly or indirectly).

 * Once a topic branch is fully cooked and merged into "master",
   it is deleted.  If you need to build on top of it to correct
   earlier mistakes, a new topic branch is created by forking at
   the tip of the "master".  This is not strictly necessary, but
   it makes it easier to keep your history simple.

 * Whenever you need to test or publish your changes to topic
   branches, merge them into "next" branch.

The script, being an example, hardcodes the publish branch name
to be "next", but it is trivial to make it configurable via
$GIT_DIR/config mechanism.

With this workflow, you would want to know:

(1) ... if a topic branch has ever been merged to "next".  Young
    topic branches can have stupid mistakes you would rather
    clean up before publishing, and things that have not been
    merged into other branches can be easily rebased without
    affecting other people.  But once it is published, you would
    not want to rewind it.

(2) ... if a topic branch has been fully merged to "master".
    Then you can delete it.  More importantly, you should not
    build on top of it -- other people may already want to
    change things related to the topic as patches against your
    "master", so if you need further changes, it is better to
    fork the topic (perhaps with the same name) afresh from the
    tip of "master".

Let's look at this example:

		   o---o---o---o---o---o---o---o---o---o "next"
		  /       /           /           /
		 /   a---a---b A     /           /
		/   /               /           /
	       /   /   c---c---c---c B         /
	      /   /   /             \         /
	     /   /   /   b---b C     \       /
	    /   /   /   /             \     /
    ---o---o---o---o---o---o---o---o---o---o---o "master"


A, B and C are topic branches.

 * A has one fix since it was merged up to "next".

 * B has finished.  It has been fully merged up to "master" and "next",
   and is ready to be deleted.

 * C has not merged to "next" at all.

We would want to allow C to be rebased, refuse A, and encourage
B to be deleted.

To compute (1):

	git rev-list ^master ^topic next
	git rev-list ^master        next

	if these match, topic has not merged in next at all.

To compute (2):

	git rev-list master..topic

	if this is empty, it is fully merged to "master".

DOC_END
````

## File: gate-monitor/.git/hooks/pre-receive.sample
````
#!/bin/sh
#
# An example hook script to make use of push options.
# The example simply echoes all push options that start with 'echoback='
# and rejects all pushes when the "reject" push option is used.
#
# To enable this hook, rename this file to "pre-receive".

if test -n "$GIT_PUSH_OPTION_COUNT"
then
	i=0
	while test "$i" -lt "$GIT_PUSH_OPTION_COUNT"
	do
		eval "value=\$GIT_PUSH_OPTION_$i"
		case "$value" in
		echoback=*)
			echo "echo from the pre-receive-hook: ${value#*=}" >&2
			;;
		reject)
			exit 1
		esac
		i=$((i + 1))
	done
fi
````

## File: gate-monitor/.git/hooks/prepare-commit-msg.sample
````
#!/bin/sh
#
# An example hook script to prepare the commit log message.
# Called by "git commit" with the name of the file that has the
# commit message, followed by the description of the commit
# message's source.  The hook's purpose is to edit the commit
# message file.  If the hook fails with a non-zero status,
# the commit is aborted.
#
# To enable this hook, rename this file to "prepare-commit-msg".

# This hook includes three examples. The first one removes the
# "# Please enter the commit message..." help message.
#
# The second includes the output of "git diff --name-status -r"
# into the message, just before the "git status" output.  It is
# commented because it doesn't cope with --amend or with squashed
# commits.
#
# The third example adds a Signed-off-by line to the message, that can
# still be edited.  This is rarely a good idea.

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
SHA1=$3

/usr/bin/perl -i.bak -ne 'print unless(m/^. Please enter the commit message/..m/^#$/)' "$COMMIT_MSG_FILE"

# case "$COMMIT_SOURCE,$SHA1" in
#  ,|template,)
#    /usr/bin/perl -i.bak -pe '
#       print "\n" . `git diff --cached --name-status -r`
# 	 if /^#/ && $first++ == 0' "$COMMIT_MSG_FILE" ;;
#  *) ;;
# esac

# SOB=$(git var GIT_COMMITTER_IDENT | sed -n 's/^\(.*>\).*$/Signed-off-by: \1/p')
# git interpret-trailers --in-place --trailer "$SOB" "$COMMIT_MSG_FILE"
# if test -z "$COMMIT_SOURCE"
# then
#   /usr/bin/perl -i.bak -pe 'print "\n" if !$first_line++' "$COMMIT_MSG_FILE"
# fi
````

## File: gate-monitor/.git/hooks/push-to-checkout.sample
````
#!/bin/sh

# An example hook script to update a checked-out tree on a git push.
#
# This hook is invoked by git-receive-pack(1) when it reacts to git
# push and updates reference(s) in its repository, and when the push
# tries to update the branch that is currently checked out and the
# receive.denyCurrentBranch configuration variable is set to
# updateInstead.
#
# By default, such a push is refused if the working tree and the index
# of the remote repository has any difference from the currently
# checked out commit; when both the working tree and the index match
# the current commit, they are updated to match the newly pushed tip
# of the branch. This hook is to be used to override the default
# behaviour; however the code below reimplements the default behaviour
# as a starting point for convenient modification.
#
# The hook receives the commit with which the tip of the current
# branch is going to be updated:
commit=$1

# It can exit with a non-zero status to refuse the push (when it does
# so, it must not modify the index or the working tree).
die () {
	echo >&2 "$*"
	exit 1
}

# Or it can make any necessary changes to the working tree and to the
# index to bring them to the desired state when the tip of the current
# branch is updated to the new commit, and exit with a zero status.
#
# For example, the hook can simply run git read-tree -u -m HEAD "$1"
# in order to emulate git fetch that is run in the reverse direction
# with git push, as the two-tree form of git read-tree -u -m is
# essentially the same as git switch or git checkout that switches
# branches while keeping the local changes in the working tree that do
# not interfere with the difference between the branches.

# The below is a more-or-less exact translation to shell of the C code
# for the default behaviour for git's push-to-checkout hook defined in
# the push_to_deploy() function in builtin/receive-pack.c.
#
# Note that the hook will be executed from the repository directory,
# not from the working tree, so if you want to perform operations on
# the working tree, you will have to adapt your code accordingly, e.g.
# by adding "cd .." or using relative paths.

if ! git update-index -q --ignore-submodules --refresh
then
	die "Up-to-date check failed"
fi

if ! git diff-files --quiet --ignore-submodules --
then
	die "Working directory has unstaged changes"
fi

# This is a rough translation of:
#
#   head_has_history() ? "HEAD" : EMPTY_TREE_SHA1_HEX
if git cat-file -e HEAD 2>/dev/null
then
	head=HEAD
else
	head=$(git hash-object -t tree --stdin </dev/null)
fi

if ! git diff-index --quiet --cached --ignore-submodules $head --
then
	die "Working directory has staged changes"
fi

if ! git read-tree -u -m "$commit"
then
	die "Could not update working tree to new HEAD"
fi
````

## File: gate-monitor/.git/hooks/sendemail-validate.sample
````
#!/bin/sh

# An example hook script to validate a patch (and/or patch series) before
# sending it via email.
#
# The hook should exit with non-zero status after issuing an appropriate
# message if it wants to prevent the email(s) from being sent.
#
# To enable this hook, rename this file to "sendemail-validate".
#
# By default, it will only check that the patch(es) can be applied on top of
# the default upstream branch without conflicts in a secondary worktree. After
# validation (successful or not) of the last patch of a series, the worktree
# will be deleted.
#
# The following config variables can be set to change the default remote and
# remote ref that are used to apply the patches against:
#
#   sendemail.validateRemote (default: origin)
#   sendemail.validateRemoteRef (default: HEAD)
#
# Replace the TODO placeholders with appropriate checks according to your
# needs.

validate_cover_letter () {
	file="$1"
	# TODO: Replace with appropriate checks (e.g. spell checking).
	true
}

validate_patch () {
	file="$1"
	# Ensure that the patch applies without conflicts.
	git am -3 "$file" || return
	# TODO: Replace with appropriate checks for this patch
	# (e.g. checkpatch.pl).
	true
}

validate_series () {
	# TODO: Replace with appropriate checks for the whole series
	# (e.g. quick build, coding style checks, etc.).
	true
}

# main -------------------------------------------------------------------------

if test "$GIT_SENDEMAIL_FILE_COUNTER" = 1
then
	remote=$(git config --default origin --get sendemail.validateRemote) &&
	ref=$(git config --default HEAD --get sendemail.validateRemoteRef) &&
	worktree=$(mktemp --tmpdir -d sendemail-validate.XXXXXXX) &&
	git worktree add -fd --checkout "$worktree" "refs/remotes/$remote/$ref" &&
	git config --replace-all sendemail.validateWorktree "$worktree"
else
	worktree=$(git config --get sendemail.validateWorktree)
fi || {
	echo "sendemail-validate: error: failed to prepare worktree" >&2
	exit 1
}

unset GIT_DIR GIT_WORK_TREE
cd "$worktree" &&

if grep -q "^diff --git " "$1"
then
	validate_patch "$1"
else
	validate_cover_letter "$1"
fi &&

if test "$GIT_SENDEMAIL_FILE_COUNTER" = "$GIT_SENDEMAIL_FILE_TOTAL"
then
	git config --unset-all sendemail.validateWorktree &&
	trap 'git worktree remove -ff "$worktree"' EXIT &&
	validate_series
fi
````

## File: gate-monitor/.git/hooks/update.sample
````
#!/bin/sh
#
# An example hook script to block unannotated tags from entering.
# Called by "git receive-pack" with arguments: refname sha1-old sha1-new
#
# To enable this hook, rename this file to "update".
#
# Config
# ------
# hooks.allowunannotated
#   This boolean sets whether unannotated tags will be allowed into the
#   repository.  By default they won't be.
# hooks.allowdeletetag
#   This boolean sets whether deleting tags will be allowed in the
#   repository.  By default they won't be.
# hooks.allowmodifytag
#   This boolean sets whether a tag may be modified after creation. By default
#   it won't be.
# hooks.allowdeletebranch
#   This boolean sets whether deleting branches will be allowed in the
#   repository.  By default they won't be.
# hooks.denycreatebranch
#   This boolean sets whether remotely creating branches will be denied
#   in the repository.  By default this is allowed.
#

# --- Command line
refname="$1"
oldrev="$2"
newrev="$3"

# --- Safety check
if [ -z "$GIT_DIR" ]; then
	echo "Don't run this script from the command line." >&2
	echo " (if you want, you could supply GIT_DIR then run" >&2
	echo "  $0 <ref> <oldrev> <newrev>)" >&2
	exit 1
fi

if [ -z "$refname" -o -z "$oldrev" -o -z "$newrev" ]; then
	echo "usage: $0 <ref> <oldrev> <newrev>" >&2
	exit 1
fi

# --- Config
allowunannotated=$(git config --type=bool hooks.allowunannotated)
allowdeletebranch=$(git config --type=bool hooks.allowdeletebranch)
denycreatebranch=$(git config --type=bool hooks.denycreatebranch)
allowdeletetag=$(git config --type=bool hooks.allowdeletetag)
allowmodifytag=$(git config --type=bool hooks.allowmodifytag)

# check for no description
projectdesc=$(sed -e '1q' "$GIT_DIR/description")
case "$projectdesc" in
"Unnamed repository"* | "")
	echo "*** Project description file hasn't been set" >&2
	exit 1
	;;
esac

# --- Check types
# if $newrev is 0000...0000, it's a commit to delete a ref.
zero=$(git hash-object --stdin </dev/null | tr '[0-9a-f]' '0')
if [ "$newrev" = "$zero" ]; then
	newrev_type=delete
else
	newrev_type=$(git cat-file -t $newrev)
fi

case "$refname","$newrev_type" in
	refs/tags/*,commit)
		# un-annotated tag
		short_refname=${refname##refs/tags/}
		if [ "$allowunannotated" != "true" ]; then
			echo "*** The un-annotated tag, $short_refname, is not allowed in this repository" >&2
			echo "*** Use 'git tag [ -a | -s ]' for tags you want to propagate." >&2
			exit 1
		fi
		;;
	refs/tags/*,delete)
		# delete tag
		if [ "$allowdeletetag" != "true" ]; then
			echo "*** Deleting a tag is not allowed in this repository" >&2
			exit 1
		fi
		;;
	refs/tags/*,tag)
		# annotated tag
		if [ "$allowmodifytag" != "true" ] && git rev-parse $refname > /dev/null 2>&1
		then
			echo "*** Tag '$refname' already exists." >&2
			echo "*** Modifying a tag is not allowed in this repository." >&2
			exit 1
		fi
		;;
	refs/heads/*,commit)
		# branch
		if [ "$oldrev" = "$zero" -a "$denycreatebranch" = "true" ]; then
			echo "*** Creating a branch is not allowed in this repository" >&2
			exit 1
		fi
		;;
	refs/heads/*,delete)
		# delete branch
		if [ "$allowdeletebranch" != "true" ]; then
			echo "*** Deleting a branch is not allowed in this repository" >&2
			exit 1
		fi
		;;
	refs/remotes/*,commit)
		# tracking branch
		;;
	refs/remotes/*,delete)
		# delete tracking branch
		if [ "$allowdeletebranch" != "true" ]; then
			echo "*** Deleting a tracking branch is not allowed in this repository" >&2
			exit 1
		fi
		;;
	*)
		# Anything else (is there anything else?)
		echo "*** Update hook: unknown type of update to ref $refname of type $newrev_type" >&2
		exit 1
		;;
esac

# --- Finished
exit 0
````

## File: gate-monitor/.git/info/exclude
````
# git ls-files --others --exclude-from=.git/info/exclude
# Lines that start with '#' are comments.
# For a project mostly in C, the following would be a good set of
# exclude patterns (uncomment them if you want to use them):
# *.[oa]
# *~
````

## File: gate-monitor/.git/info/refs
````
9fa7e546b24a9b88f03e61027b40484e12268d50	refs/heads/main
ba7637264095adb4006e813ed7cc050304c4b7fe	refs/remotes/origin/main
````

## File: gate-monitor/.git/logs/refs/heads/main
````
0000000000000000000000000000000000000000 89ab7194f94da17879f694530d9c188bde92104b akarsh <jadiakarshjadi1010@gmail.com> 1786761733 +0530	commit (initial): Initial commit from Create Next App
89ab7194f94da17879f694530d9c188bde92104b f57131d39ea6ceb9ad9a085ba922ab88b74dc115 akarsh <jadiakarshjadi1010@gmail.com> 1786772330 +0530	commit: Initial commit: Gate Monitor system
f57131d39ea6ceb9ad9a085ba922ab88b74dc115 f57131d39ea6ceb9ad9a085ba922ab88b74dc115 akarsh <jadiakarshjadi1010@gmail.com> 1786772341 +0530	Branch: renamed refs/heads/main to refs/heads/main
f57131d39ea6ceb9ad9a085ba922ab88b74dc115 ba7637264095adb4006e813ed7cc050304c4b7fe akarsh <jadiakarshjadi1010@gmail.com> 1786772477 +0530	reset: moving to origin/main
ba7637264095adb4006e813ed7cc050304c4b7fe 4a504aed3f3d657526b15b8bf210fb38827b37d9 akarsh <jadiakarshjadi1010@gmail.com> 1786772504 +0530	commit: Add Gate Monitor system project files
4a504aed3f3d657526b15b8bf210fb38827b37d9 ba7637264095adb4006e813ed7cc050304c4b7fe akarsh <jadiakarshjadi1010@gmail.com> 1786772517 +0530	reset: moving to origin/main
ba7637264095adb4006e813ed7cc050304c4b7fe 9fa7e546b24a9b88f03e61027b40484e12268d50 akarsh <jadiakarshjadi1010@gmail.com> 1786772521 +0530	commit: Add gitignore to exclude node_modules
9fa7e546b24a9b88f03e61027b40484e12268d50 ee53330a53d96a7dd6f8edd5189a061bbd73f5cb akarsh <jadiakarshjadi1010@gmail.com> 1786797697 +0530	commit: Initial commit of existing gate-monitor project
ee53330a53d96a7dd6f8edd5189a061bbd73f5cb 8caa85eac9750b54450f2d04137a0f1c74e70cb1 akarsh <jadiakarshjadi1010@gmail.com> 1786800066 +0530	commit: Initial commit
8caa85eac9750b54450f2d04137a0f1c74e70cb1 8364bcd8550f036b5067bdac1f8f9f6110f05b25 akarsh <jadiakarshjadi1010@gmail.com> 1786800308 +0530	commit: feat: setup basic layouts and pages for all roles
8364bcd8550f036b5067bdac1f8f9f6110f05b25 601b58e995f029dcfe7962c00fb5c44bc730566f akarsh <jadiakarshjadi1010@gmail.com> 1786800548 +0530	commit: feat: implement basic UI for operator and supervisor roles
601b58e995f029dcfe7962c00fb5c44bc730566f a4e194f03280627c8a8653a20a577eebc5dda201 akarsh <jadiakarshjadi1010@gmail.com> 1786800719 +0530	commit: feat: implement basic UI for admin dashboard
a4e194f03280627c8a8653a20a577eebc5dda201 74df223c105dbb0996b3a7a4505926308d6a7de3 akarsh <jadiakarshjadi1010@gmail.com> 1786801434 +0530	commit: feat: implement basic UI for student, parent, and sysadmin roles
````

## File: gate-monitor/.git/logs/refs/remotes/origin/main
````
0000000000000000000000000000000000000000 ba7637264095adb4006e813ed7cc050304c4b7fe akarsh <jadiakarshjadi1010@gmail.com> 1786772437 +0530	pull --rebase origin main: storing head
ba7637264095adb4006e813ed7cc050304c4b7fe 9fa7e546b24a9b88f03e61027b40484e12268d50 akarsh <jadiakarshjadi1010@gmail.com> 1786772533 +0530	update by push
````

## File: gate-monitor/.git/logs/HEAD
````
0000000000000000000000000000000000000000 89ab7194f94da17879f694530d9c188bde92104b akarsh <jadiakarshjadi1010@gmail.com> 1786761733 +0530	commit (initial): Initial commit from Create Next App
89ab7194f94da17879f694530d9c188bde92104b f57131d39ea6ceb9ad9a085ba922ab88b74dc115 akarsh <jadiakarshjadi1010@gmail.com> 1786772330 +0530	commit: Initial commit: Gate Monitor system
f57131d39ea6ceb9ad9a085ba922ab88b74dc115 0000000000000000000000000000000000000000 akarsh <jadiakarshjadi1010@gmail.com> 1786772341 +0530	Branch: renamed refs/heads/main to refs/heads/main
f57131d39ea6ceb9ad9a085ba922ab88b74dc115 f57131d39ea6ceb9ad9a085ba922ab88b74dc115 akarsh <jadiakarshjadi1010@gmail.com> 1786772341 +0530	Branch: renamed refs/heads/main to refs/heads/main
f57131d39ea6ceb9ad9a085ba922ab88b74dc115 ba7637264095adb4006e813ed7cc050304c4b7fe akarsh <jadiakarshjadi1010@gmail.com> 1786772437 +0530	pull --rebase origin main (start): checkout ba7637264095adb4006e813ed7cc050304c4b7fe
ba7637264095adb4006e813ed7cc050304c4b7fe b84a72b39317f396591a2218dc4e2f08b0cd4661 akarsh <jadiakarshjadi1010@gmail.com> 1786772454 +0530	commit: Add Gate Monitor system project files
b84a72b39317f396591a2218dc4e2f08b0cd4661 f57131d39ea6ceb9ad9a085ba922ab88b74dc115 akarsh <jadiakarshjadi1010@gmail.com> 1786772463 +0530	rebase (abort): returning to refs/heads/main
f57131d39ea6ceb9ad9a085ba922ab88b74dc115 ba7637264095adb4006e813ed7cc050304c4b7fe akarsh <jadiakarshjadi1010@gmail.com> 1786772477 +0530	reset: moving to origin/main
ba7637264095adb4006e813ed7cc050304c4b7fe 4a504aed3f3d657526b15b8bf210fb38827b37d9 akarsh <jadiakarshjadi1010@gmail.com> 1786772504 +0530	commit: Add Gate Monitor system project files
4a504aed3f3d657526b15b8bf210fb38827b37d9 ba7637264095adb4006e813ed7cc050304c4b7fe akarsh <jadiakarshjadi1010@gmail.com> 1786772517 +0530	reset: moving to origin/main
ba7637264095adb4006e813ed7cc050304c4b7fe 9fa7e546b24a9b88f03e61027b40484e12268d50 akarsh <jadiakarshjadi1010@gmail.com> 1786772521 +0530	commit: Add gitignore to exclude node_modules
9fa7e546b24a9b88f03e61027b40484e12268d50 ee53330a53d96a7dd6f8edd5189a061bbd73f5cb akarsh <jadiakarshjadi1010@gmail.com> 1786797697 +0530	commit: Initial commit of existing gate-monitor project
ee53330a53d96a7dd6f8edd5189a061bbd73f5cb 8caa85eac9750b54450f2d04137a0f1c74e70cb1 akarsh <jadiakarshjadi1010@gmail.com> 1786800066 +0530	commit: Initial commit
8caa85eac9750b54450f2d04137a0f1c74e70cb1 8364bcd8550f036b5067bdac1f8f9f6110f05b25 akarsh <jadiakarshjadi1010@gmail.com> 1786800308 +0530	commit: feat: setup basic layouts and pages for all roles
8364bcd8550f036b5067bdac1f8f9f6110f05b25 601b58e995f029dcfe7962c00fb5c44bc730566f akarsh <jadiakarshjadi1010@gmail.com> 1786800548 +0530	commit: feat: implement basic UI for operator and supervisor roles
601b58e995f029dcfe7962c00fb5c44bc730566f a4e194f03280627c8a8653a20a577eebc5dda201 akarsh <jadiakarshjadi1010@gmail.com> 1786800719 +0530	commit: feat: implement basic UI for admin dashboard
a4e194f03280627c8a8653a20a577eebc5dda201 74df223c105dbb0996b3a7a4505926308d6a7de3 akarsh <jadiakarshjadi1010@gmail.com> 1786801434 +0530	commit: feat: implement basic UI for student, parent, and sysadmin roles
````

## File: gate-monitor/.git/objects/info/packs
````
P pack-15a311a139a4457c604bb5dd88a6f8fb0bb0cfe8.pack
````

## File: gate-monitor/.git/refs/heads/main
````
74df223c105dbb0996b3a7a4505926308d6a7de3
````

## File: gate-monitor/.git/refs/remotes/origin/main
````
9fa7e546b24a9b88f03e61027b40484e12268d50
````

## File: gate-monitor/.git/COMMIT_EDITMSG
````
feat: implement basic UI for student, parent, and sysadmin roles
````

## File: gate-monitor/.git/config
````
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
	ignorecase = true
	precomposeunicode = true
[remote "origin"]
	url = https://github.com/Akarshjadi/samples_clg.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
````

## File: gate-monitor/.git/description
````
Unnamed repository; edit this file 'description' to name the repository.
````

## File: gate-monitor/.git/FETCH_HEAD
````
ba7637264095adb4006e813ed7cc050304c4b7fe		branch 'main' of https://github.com/Akarshjadi/samples_clg
````

## File: gate-monitor/.git/HEAD
````
ref: refs/heads/main
````

## File: gate-monitor/.git/ORIG_HEAD
````
4a504aed3f3d657526b15b8bf210fb38827b37d9
````

## File: gate-monitor/public/file.svg
````xml
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
````

## File: gate-monitor/public/globe.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
````

## File: gate-monitor/public/next.svg
````xml
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
````

## File: gate-monitor/public/vercel.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
````

## File: gate-monitor/public/window.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
````

## File: gate-monitor/src/app/(admin)/admin/alerts/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle, Check } from "lucide-react";
import type { Alert } from "@/lib/types";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-rose-500/10", text: "text-rose-400", label: "Critical" },
  high: { bg: "bg-amber-500/10", text: "text-amber-400", label: "High" },
  medium: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Medium" },
  low: { bg: "bg-slate-500/10", text: "text-slate-400", label: "Low" },
  info: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Info" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const url = filter === "all" ? "/api/alerts" : `/api/alerts?resolved=${filter === "resolved"}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setAlerts(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const resolve = async (id: string) => {
    setBusyId(id);
    // We don't yet have a dedicated /api/alerts/[id] PATCH route; use the admin endpoint if available.
    // For now, mark locally as resolved and re-fetch.
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-[var(--text-muted)]">System alerts and notifications</p>
        </div>
        <div className="flex gap-2">
          {(["active", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                filter === f
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--action-warning)]" />
            Alerts
          </h3>
          <span className="text-sm text-[var(--text-muted)]">
            {loading ? "Loading…" : `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">Loading…</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">
              No {filter === "all" ? "" : filter} alerts.
            </div>
          ) : (
            alerts.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
              return (
                <div key={alert.id} className="p-4 flex items-start gap-4">
                  <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
                    {alert.resolved ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{alert.title}</p>
                      <span className="text-xs text-[var(--text-muted)]">{timeAgo(alert.timestamp)}</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {alert.studentRoll && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{alert.studentRoll}</span>
                      )}
                      {alert.gateId && (
                        <span className="text-[10px] text-[var(--text-muted)]">at {alert.gateId}</span>
                      )}
                    </div>
                  </div>
                  {!alert.resolved && (
                    <button
                      onClick={() => resolve(alert.id)}
                      disabled={busyId === alert.id}
                      className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 inline-flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(admin)/admin/attendance/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Scan, Student } from "@/lib/types";

interface Row {
  roll: string;
  name: string;
  department: string;
  timeIn: string | null;
  timeOut: string | null;
  status: "present" | "absent" | "late";
  lastTimestamp: string | null;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [logsRes, stuRes] = await Promise.all([
          fetch(`/api/gate/logs?date=${date}&limit=10000`, { cache: "no-store" }),
          fetch(`/api/students`, { cache: "no-store" }),
        ]);
        const logsJson = await logsRes.json();
        const stuJson = await stuRes.json();
        if (cancelled) return;

        const logs: Scan[] = logsJson?.data?.items ?? [];
        const students: Student[] = stuJson?.data ?? [];

        // For each student: find first IN and last OUT of the day
        const byRoll: Record<string, Row> = {};
        for (const s of students) {
          byRoll[s.roll] = {
            roll: s.roll,
            name: s.name,
            department: s.department,
            timeIn: null,
            timeOut: null,
            status: "absent",
            lastTimestamp: null,
          };
        }
        for (const log of logs) {
          const row = (byRoll[log.roll] ??= {
            roll: log.roll,
            name: log.name,
            department: log.department,
            timeIn: null,
            timeOut: null,
            status: "absent",
            lastTimestamp: null,
          });
          if (log.direction === "IN") {
            if (!row.timeIn) row.timeIn = log.timestamp;
          } else if (log.direction === "OUT") {
            row.timeOut = log.timestamp;
          }
          row.lastTimestamp = log.timestamp;
        }
        // Determine status: present if timeIn, late if timeIn > 9:15am, absent if no timeIn
        for (const r of Object.values(byRoll)) {
          if (!r.timeIn) {
            r.status = "absent";
          } else {
            const inTime = new Date(r.timeIn);
            const cutoff = new Date(r.timeIn);
            cutoff.setHours(9, 15, 0, 0);
            r.status = inTime > cutoff ? "late" : "present";
          }
        }
        // Only show students that had any activity today OR mark as absent (capped)
        const present = Object.values(byRoll).filter((r) => r.timeIn || r.timeOut);
        const absent = Object.values(byRoll).filter((r) => !r.timeIn && !r.timeOut).slice(0, 50);
        setRows([...present, ...absent]);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const stats = {
    present: rows.filter((r) => r.status === "present").length,
    late: rows.filter((r) => r.status === "late").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-[var(--text-muted)]">Daily student attendance records</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.present}</p>
          <p className="text-xs text-[var(--text-muted)]">Present</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.late}</p>
          <p className="text-xs text-[var(--text-muted)]">Late</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <p className="text-2xl font-bold text-rose-400">{stats.absent}</p>
          <p className="text-xs text-[var(--text-muted)]">Absent</p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[var(--action-primary)]" />
            {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </h3>
          <span className="text-sm text-[var(--text-muted)]">
            {loading ? "Loading…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Roll No</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Time In</th>
                <th className="p-4 font-medium">Time Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No records</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.roll}>
                    <td className="p-4 font-medium">{r.name}</td>
                    <td className="p-4 font-mono text-[var(--text-muted)]">{r.roll}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        r.status === "present" ? "bg-emerald-500/10 text-emerald-400" :
                        r.status === "absent" ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>
                        {r.status === "present" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         r.status === "absent" ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock className="w-3.5 h-3.5" />}
                        <span className="capitalize">{r.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">{fmtTime(r.timeIn)}</td>
                    <td className="p-4 text-[var(--text-muted)]">{fmtTime(r.timeOut)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(admin)/admin/dashboard/page.tsx
````typescript
import { redirect } from "next/navigation";

export default function AdminDashboardRedirect() {
  redirect("/admin");
}
````

## File: gate-monitor/src/app/(admin)/admin/reports/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { FileText, Download, BarChart3, Loader2 } from "lucide-react";
import type { DashboardData } from "@/lib/types";

interface GeneratedReport {
  id: string;
  title: string;
  range: string;
  type: "Daily" | "Weekly" | "Monthly";
  generatedAt: string;
  source: "auto" | "manual";
}

const TYPES: GeneratedReport["type"][] = ["Daily", "Weekly", "Monthly"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function rangeFor(type: GeneratedReport["type"]): string {
  const t = new Date();
  if (type === "Daily") {
    return t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (type === "Weekly") {
    const start = new Date(t);
    start.setDate(t.getDate() - 6);
    return `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  // Monthly
  return t.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function downloadReportCSV(report: GeneratedReport, data: DashboardData | null) {
  if (!data) return;
  const rows: string[] = [
    ["Date", report.range].join(","),
    ["Metric", "Value"].join(","),
    ["Total Students (on campus)", String(data.onCampus)].join(","),
    ["Total Scans (today)", String(data.totalScans)].join(","),
    ["Entries (today)", String(data.todayIn)].join(","),
    ["Exits (today)", String(data.todayOut)].join(","),
    ["Active Alerts", String(data.activeAlerts)].join(","),
    "",
    ["Department", "In", "Out", "% of Activity"].join(","),
    ...data.deptBreakdown.map((d) => [d.dept, d.in, d.out, `${d.pct}%`].join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.replace(/\s+/g, "_")}_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState<GeneratedReport[]>([]);
  const [busy, setBusy] = useState<GeneratedReport["type"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          if (json.success) setData(json.data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = (type: GeneratedReport["type"]) => {
    setBusy(type);
    setTimeout(() => {
      const rep: GeneratedReport = {
        id: `rpt-${Date.now()}`,
        title: `${type} Gate Activity Report`,
        range: rangeFor(type),
        type,
        generatedAt: new Date().toISOString(),
        source: "manual",
      };
      setGenerated((prev) => [rep, ...prev]);
      setBusy(null);
    }, 500);
  };

  const exportAll = () => {
    if (!data) return;
    const rep: GeneratedReport = {
      id: `rpt-${Date.now()}`,
      title: "All-Data Export",
      range: todayISO(),
      type: "Daily",
      generatedAt: new Date().toISOString(),
      source: "manual",
    };
    downloadReportCSV(rep, data);
  };

  const attendanceRate = data
    ? data.totalScans > 0
      ? Math.round((data.todayIn / (data.todayIn + Math.max(1, data.todayOut))) * 100)
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-[var(--text-muted)]">Generate and download reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <BarChart3 className="w-6 h-6 text-[var(--action-primary)] mb-3" />
          <p className="text-2xl font-bold">{loading ? "—" : (data?.onCampus ?? 0).toLocaleString()}</p>
          <p className="text-sm text-[var(--text-muted)]">Students on Campus</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <BarChart3 className="w-6 h-6 text-[var(--action-info)] mb-3" />
          <p className="text-2xl font-bold">{loading ? "—" : (data?.totalScans ?? 0).toLocaleString()}</p>
          <p className="text-sm text-[var(--text-muted)]">Scans Today</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <BarChart3 className="w-6 h-6 text-[var(--action-warning)] mb-3" />
          <p className="text-2xl font-bold">{loading ? "—" : `${attendanceRate}%`}</p>
          <p className="text-sm text-[var(--text-muted)]">Activity Ratio (In/(In+Out))</p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--action-primary)]" />
            Available Reports
          </h3>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => generate(t)}
                disabled={busy !== null || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--bg-base)] border border-[var(--border)] hover:border-[var(--action-primary)] disabled:opacity-50"
              >
                {busy === t && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generate {t}
              </button>
            ))}
            <button
              onClick={exportAll}
              disabled={loading || !data}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-[var(--action-primary)] text-white hover:brightness-110 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {generated.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">
              No reports generated yet. Click a button above to create one.
            </div>
          ) : (
            generated.map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{report.title}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {report.range} • {new Date(report.generatedAt).toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)]">
                    {report.type}
                  </span>
                  <button
                    onClick={() => downloadReportCSV(report, data)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--action-primary)] hover:bg-white/5"
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(admin)/admin/settings/page.tsx
````typescript
import { Settings, Bell, Shield, Database, Save } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-muted)]">Configure system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[var(--action-warning)]" />
            Notification Settings
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Email alerts for gate anomalies</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">SMS alerts for unauthorized access</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Push notifications for supervisors</span>
              <input type="checkbox" className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[var(--action-info)]" />
            Security Settings
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Two-factor authentication</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Session timeout (30 min)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">IP whitelisting</span>
              <input type="checkbox" className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-[var(--action-primary)]" />
            Data Management
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Automatic daily backups</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Retention period (90 days)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--action-warning)]" />
            General Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">College Name</label>
              <input type="text" defaultValue="JNTUH University College of Engineering" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Default Gate</label>
              <select className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm">
                <option>Gate 1 (Main)</option>
                <option>Gate 2 (Hostel)</option>
                <option>Gate 3 (Back Gate)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--action-primary)] text-white font-medium hover:brightness-110">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(admin)/admin/students/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { User, Search, UserPlus } from "lucide-react";
import { parseRollNumber, getStudentYearFromRoll } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url = query.trim()
          ? `/api/students?q=${encodeURIComponent(query.trim())}`
          : "/api/students";
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setStudents(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-[var(--text-muted)]">
            {loading ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"} registered`}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--action-primary)] text-white hover:brightness-110">
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center gap-2">
          <h3 className="font-semibold">All Students</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              className="pl-10 pr-4 py-2 w-64 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Roll No</th>
                <th className="p-4 font-medium">Branch</th>
                <th className="p-4 font-medium">Year</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading…</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                  {query ? "No matches" : "No students registered yet"}
                </td></tr>
              ) : (
                students.map((student) => {
                  const decoded = parseRollNumber(student.roll);
                  const branch = decoded?.departmentFullName ?? student.department ?? "—";
                  const year = getStudentYearFromRoll(student.roll) ?? student.year ?? "—";
                  const active = (student.status ?? "active").toLowerCase() === "active";
                  return (
                    <tr key={student.id} className="hover:bg-white/5">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{student.roll}</td>
                      <td className="p-4">{branch}</td>
                      <td className="p-4">{year}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(admin)/admin/page.tsx
````typescript
"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { EntryExitChart } from "@/components/admin/EntryExitChart";
import { StudentList } from "@/components/admin/StudentList";
import { Users, DoorOpen, Activity, AlertTriangle } from "lucide-react";
import type { DashboardData } from "@/lib/types";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message ?? "Failed to load dashboard");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Refresh every 30s for live feel
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-[var(--text-muted)]">Loading live data…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
          {error}. Make sure the database is reachable.
        </div>
      </div>
    );
  }

  const activeGates = (data?.locations ?? []).filter((l) => l.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-[var(--text-muted)]">Live gate activity, students, and alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Students on Campus"
          value={(data?.onCampus ?? 0).toLocaleString()}
          icon={Users}
          color="#3b82f6"
          trend={data?.trendOnCampus}
        />
        <StatCard
          label="Active Gates"
          value={activeGates.toString()}
          icon={DoorOpen}
          color="#10b981"
        />
        <StatCard
          label="Today's Scans"
          value={(data?.totalScans ?? 0).toLocaleString()}
          icon={Activity}
          color="#8b5cf6"
          trend={data?.trendScans}
        />
        <StatCard
          label="Active Alerts"
          value={(data?.activeAlerts ?? 0).toString()}
          icon={AlertTriangle}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntryExitChart />
        <StudentList />
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(admin)/layout.tsx
````typescript
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(operator)/gate/[gateId]/page.tsx
````typescript
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Power, RefreshCw, Wifi, WifiOff, AlertTriangle, User } from "lucide-react";
import { COLLEGE } from "@/lib/db";
import { SAMPLE_ROLL_NUMBERS, parseRollNumber } from "@/lib/rollNumber";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { ManualEntryDialog } from "@/components/operator/ManualEntryDialog";
import { LastScanCard } from "@/components/operator/LastScanCard";
import { OperatorStats } from "@/components/operator/OperatorStats";
import type { ScanDirection, ExitReason } from "@/lib/types";

const GATE_NAMES: Record<string, string> = {
  "gate-1": "Gate 1 (Main)",
  "gate-2": "Gate 2 (Hostel)",
  "gate-3": "Gate 3 (Back Gate)",
};

const SAMPLE_ROLLS = SAMPLE_ROLL_NUMBERS;

export default function OperatorPage() {
  const params = useParams<{ gateId: string }>();
  const gateId = params?.gateId || "gate-1";
  const { user, authenticated, loginAsRole } = useAuth();
  const {
    state,
    currentStudent,
    selectedDirection,
    selectedReason,
    photoVerificationDone,
    lastScan,
    todaysStats,
    recentScans,
    error,
    isOnline,
    startScan,
    setDirection,
    setReason,
    confirmScan,
    cancelScan,
    reset,
    setGate,
    setOnline,
  } = useOperatorStore();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [tripleTapCount, setTripleTapCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      loginAsRole("operator");
    }
    setGate(gateId);
    reset();
  }, [authenticated, gateId, loginAsRole, setGate, reset]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [setOnline]);

  const handleTripleTap = () => {
    setTripleTapCount((prev) => prev + 1);
    setTimeout(() => setTripleTapCount(0), 1500);
  };

  useEffect(() => {
    if (tripleTapCount >= 3) {
      setShowLogoutConfirm(true);
      setTripleTapCount(0);
    }
  }, [tripleTapCount]);

  const gateName = GATE_NAMES[gateId] || gateId;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-6 border-b border-[var(--border)] bg-[var(--bg-surface)]/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏛️</span>
          <span className="font-bold text-sm">{COLLEGE.shortName}</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="text-sm font-medium text-[var(--focus-ring)]">{gateName}</span>
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleTripleTap}>
          <span className="text-xs text-[var(--text-muted)]">👤 {user?.name || "Op #3"}</span>
          <span className="text-xs text-[var(--text-muted)]">🔋 85%</span>
          {isOnline ? (
            <Wifi className="w-4 h-4 text-[var(--action-primary)]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[var(--action-warning)]" />
          )}
          <Power className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      </header>

      {/* Camera / Scan Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full">
          {state === "success" && <SuccessFlash />}

          {state === "error" && error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center bg-red-500/10 border-2 border-red-500/30 rounded-xl"
            >
              <AlertTriangle className="w-12 h-12 text-[var(--action-danger)] mb-4" />
              <p className="text-xl font-bold text-[var(--action-danger)]">{error.code}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">{error.message}</p>
            </motion.div>
          )}

          {state === "confirming" && currentStudent && (
            <ScanConfirmationModal
              student={currentStudent}
              selectedDirection={selectedDirection}
              selectedReason={selectedReason}
              onDirectionSelect={setDirection}
              onConfirm={confirmScan}
              onCancel={cancelScan}
              onReasonSelect={setReason}
            />
          )}

          {state !== "success" && state !== "error" && state !== "confirming" && (
            <CameraViewfinder
              onScan={startScan}
              scanning={state === "detecting"}
              sampleRolls={SAMPLE_ROLLS}
            />
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <LastScanCard lastScan={lastScan} />
            {todaysStats && (
              <OperatorStats
                entries={todaysStats.entries}
                exits={todaysStats.exits}
                onCampus={todaysStats.onCampus}
              />
            )}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
              <button
                onClick={() => setShowManualEntry(true)}
                className="w-full h-12 px-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--border-strong)] transition-colors flex items-center justify-center gap-2"
              >
                <span>🔲</span> Manual Entry
              </button>
              <button
                onClick={reset}
                className="w-full h-10 px-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:text-[var(--action-primary)] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Stats
              </button>
              {!isOnline && useOperatorStore.getState().offlineQueue.length > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-[var(--action-warning)]/10 border border-[var(--action-warning)]/30 text-[var(--action-warning)] text-xs flex items-center gap-2">
                  <span>📡</span>
                  Offline — {useOperatorStore.getState().offlineQueue.length} scans queued
                </div>
              )}
            </div>
          </div>

          {/* Recent Scans */}
          <div className="mt-4">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
              RECENT SCANS (last 5)
            </p>
            <div className="space-y-1.5">
              {recentScans.length > 0 ? (
                recentScans.slice(0, 5).map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between py-2 px-3 bg-[var(--bg-base)]/50 rounded-lg border border-[var(--border)]/40"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge direction={scan.direction} reason={scan.reason as any} size="sm" />
                      <span className="font-mono text-xs text-[var(--text-secondary)]">{scan.roll}</span>
                      <span className="text-sm font-medium">{scan.name}</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)] py-4 text-center">No scans yet today</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ManualEntryDialog
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        gateId={gateId}
      />

      {/* Logout Confirmation (triple-tap) */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Confirm Logout</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                You are about to log out of the Gate Operator session. Continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-11 px-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => loginAsRole("operator").then(() => setShowLogoutConfirm(false))}
                  className="flex-1 h-11 px-4 rounded-lg bg-[var(--action-danger)] text-white font-medium hover:bg-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Camera viewfinder with scan reticle and sample roll buttons */
function CameraViewfinder({
  onScan,
  scanning,
  sampleRolls,
}: {
  onScan: (roll: string) => void;
  scanning: boolean;
  sampleRolls: string[];
}) {
  return (
    <div className="relative h-full min-h-[360px] bg-black rounded-xl overflow-hidden border-2 border-[var(--border)]">
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <CameraIcon className="w-16 h-16 text-[var(--text-muted)]/30" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[var(--text-muted)]">
          <ScanLineIcon className="w-4 h-4 animate-pulse" />
          <span className="text-xs">Camera Active</span>
        </div>
      </div>

      {/* Scan Ring reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64">
          <motion.div
            className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[var(--action-primary)] rounded-tl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[var(--action-primary)] rounded-tr-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[var(--action-primary)] rounded-bl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[var(--action-primary)] rounded-br-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-[var(--action-primary)]/60"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-white/80 text-sm mb-2">Align QR within frame</p>
            <p className="text-white/50 text-xs">Place student ID card here</p>
          </div>
        </div>
      </div>

      {/* Sample roll buttons (demo mode) */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-surface)]/80 backdrop-blur border-t border-[var(--border)] p-3 flex flex-wrap justify-center gap-2">
        {sampleRolls.map((roll) => (
          <button
            key={roll}
            type="button"
            onClick={() => !scanning && onScan(roll)}
            disabled={scanning}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:border-[var(--action-primary)] hover:text-[var(--action-primary)] transition-colors disabled:opacity-40"
          >
            {roll}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] w-full mt-1">Tap a roll to simulate QR scan</span>
      </div>
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v18M3 16.5V7.5M3 16.5l4.5 4.5m0-12L3 3m4.5 4.5L12 7.5m-4.5 0v9m0-9L3 7.5m4.5 0L12 7.5m0 0v9" />
    </svg>
  );
}

function ScanLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v18M3 16.5V7.5M3 16.5l4.5 4.5m0-12L3 3m4.5 4.5L12 7.5" />
    </svg>
  );
}

/** Scan confirmation modal with photo verification lock */
function ScanConfirmationModal({
  student,
  selectedDirection,
  selectedReason,
  onDirectionSelect,
  onConfirm,
  onCancel,
  onReasonSelect,
}: {
  student: any;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  onDirectionSelect: (dir: ScanDirection) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReasonSelect: (reason: ExitReason) => void;
}) {
  // Decode the scanned roll number per the JNTUH hall-ticket schema
  const decoded = student?.roll ? parseRollNumber(student.roll) : null;
  const [photoTimer, setPhotoTimer] = useState(2);
  const [confirmStep, setConfirmStep] = useState<"photo" | "direction" | "reason">("photo");

  useEffect(() => {
    if (confirmStep === "photo") {
      const timer = setInterval(() => {
        setPhotoTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setConfirmStep("direction");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [confirmStep]);

  const reasonOptions: { val: ExitReason; label: string; color: string }[] = [
    { val: "Home Out", label: "🏠 Home Out", color: "bg-[var(--action-danger)]" },
    { val: "Day Out", label: "☀️ Day Out", color: "bg-[var(--action-warning)]" },
    { val: "Leave", label: "📝 Leave", color: "bg-[var(--action-info)]" },
    { val: "Regular", label: "🚶 Regular", color: "bg-[var(--action-danger)]" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Student Photo with verification lock */}
          <div className="relative mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--border)] mb-4">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
                <User className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
            )}
            {confirmStep === "photo" && photoTimer > 0 && (
              <div className="absolute -inset-1 rounded-full border-2 border-[var(--focus-ring)] animate-pulse" />
            )}
          </div>

          {/* Countdown overlay */}
          {confirmStep === "photo" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/70 flex items-center justify-center text-white text-2xl font-bold">
                {photoTimer}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-1">{student.name}</h2>
          <p className="text-[var(--text-secondary)] font-mono">{student.roll}</p>
          {decoded ? (
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {decoded.department} ({decoded.departmentCode}) • {decoded.entryMode} • Batch {decoded.admissionYear}
            </p>
          ) : (
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {student.department} • Year {student.year}
            </p>
          )}

          {confirmStep === "photo" ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Verifying student identity... ({photoTimer}s)
            </p>
          ) : confirmStep === "direction" ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-4">Is this student ENTERING or EXITING?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onDirectionSelect("IN")}
                  className="h-14 px-4 rounded-lg bg-[var(--action-primary)] text-white font-semibold text-lg hover:brightness-110 transition-all active:scale-[0.98]"
                >
                  🟢 ENTRY
                </button>
                <button
                  onClick={() => onDirectionSelect("OUT")}
                  className="h-14 px-4 rounded-lg bg-[var(--action-danger)] text-white font-semibold text-lg hover:brightness-110 transition-all active:scale-[0.98]"
                >
                  🔴 EXIT
                </button>
              </div>
              <button
                onClick={onCancel}
                className="mt-4 w-full h-10 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </>
          ) : confirmStep === "reason" ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-4">Select reason for exit:</p>
              <div className="grid grid-cols-2 gap-2">
                {reasonOptions.map((r) => (
                  <button
                    key={r.val}
                    onClick={() => onReasonSelect(r.val)}
                    className={`h-12 px-3 rounded-lg text-white font-medium text-sm ${r.color} hover:brightness-110 transition-all active:scale-[0.98]`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setConfirmStep("direction")}
                className="mt-3 w-full h-10 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ← Back
              </button>
            </>
          ) : null}
        </div>

        {confirmStep === "direction" && selectedDirection === "IN" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onConfirm}
            className="mt-4 w-full h-14 rounded-lg bg-[var(--action-primary)] text-white font-bold text-xl hover:brightness-110 transition-all active:scale-[0.98]"
          >
            ✅ CONFIRM ENTRY
          </motion.button>
        )}

        {confirmStep === "direction" && selectedDirection === "OUT" && selectedReason && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onConfirm}
            className="mt-4 w-full h-14 rounded-lg bg-[var(--action-danger)] text-white font-bold text-xl hover:brightness-110 transition-all active:scale-[0.98]"
          >
            🚪 CONFIRM EXIT
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
````

## File: gate-monitor/src/app/(operator)/layout.tsx
````typescript
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(parent)/parent/child/page.tsx
````typescript
import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";

export default function ParentChildPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Child Details</h1>
        <p className="text-[var(--text-muted)]">View your child's status and activity</p>
      </div>

      <ChildStatus />

      <ChildActivity />
    </div>
  );
}
````

## File: gate-monitor/src/app/(parent)/parent/passes/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { RequestPassForm } from "@/components/parent/RequestPassForm";
import { Ticket, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { GatePass, GatePassStatus } from "@/lib/types";

function statusStyle(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") {
    return "bg-emerald-500/10 text-emerald-400";
  }
  if (status === "PENDING" || status === "APPROVED_PARENT" || status === "APPROVED_ADMIN") {
    return "bg-amber-500/10 text-amber-400";
  }
  return "bg-rose-500/10 text-rose-400";
}

function statusIcon(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return <CheckCircle2 className="w-3 h-3" />;
  if (status === "REJECTED") return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

export default function ParentPassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
      const res = await fetch(`/api/passes?parentId=${parentId}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setPasses(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pass Requests</h1>
        <p className="text-[var(--text-muted)]">Request and track gate passes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RequestPassForm />

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-[var(--action-primary)]" />
            Recent Pass Requests
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : passes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No pass requests yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {passes.map((pass) => (
                <div key={pass.id} className="p-3 bg-[var(--bg-base)]/50 rounded-lg border border-[var(--border)]/40">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium">{pass.reason}</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle(pass.finalStatus)}`}>
                      {statusIcon(pass.finalStatus)}
                      <span>{pass.finalStatus}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {pass.studentName} • {pass.roll}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {new Date(pass.from).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" → "}
                    {new Date(pass.to).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {pass.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5 italic">"{pass.description}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(parent)/parent/settings/page.tsx
````typescript
import { Bell, User, Shield, Save } from "lucide-react";

export default function ParentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[var(--action-primary)]" />
            Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <input type="text" defaultValue="Parent Name" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" defaultValue="parent@example.com" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input type="tel" defaultValue="+91 98765 43210" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[var(--action-warning)]" />
            Notifications
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Child entry/exit alerts</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Pass request updates</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Emergency notifications</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--action-primary)]" />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[var(--action-info)]" />
            Security
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Current PIN</label>
              <input type="password" placeholder="••••" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">New PIN</label>
              <input type="password" placeholder="••••" className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--action-primary)] text-white font-medium hover:brightness-110">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(parent)/parent/page.tsx
````typescript
import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";
import { RequestPassForm } from "@/components/parent/RequestPassForm";

export default function ParentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-[var(--text-muted)]">Monitor your child's campus activity</p>
      </div>

      <ChildStatus />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChildActivity />
        <RequestPassForm />
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(parent)/layout.tsx
````typescript
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(student)/student/history/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2, Filter } from "lucide-react";
import type { Scan } from "@/lib/types";

export default function StudentHistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/students/${encodeURIComponent(roll)}/history?limit=200`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setScans(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filter === "ALL" ? scans : scans.filter((s) => s.direction === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My History</h1>
          <p className="text-[var(--text-muted)]">All your gate activity</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-1">
          {(["ALL", "IN", "OUT"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                filter === f
                  ? "bg-[var(--action-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            <Filter className="w-8 h-8 mx-auto opacity-40 mb-2" />
            No scans match this filter.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((s) => {
              const isIn = s.direction === "IN";
              return (
                <div key={s.id} className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIn ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isIn ? "text-emerald-400" : "text-rose-400"}`}>
                      {isIn ? "Entry" : "Exit"} {s.reason ? `(${s.reason})` : ""}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {s.gateName} {s.operatorName ? `• Operator: ${s.operatorName}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{new Date(s.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(s.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(student)/student/id/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";

export default function StudentIdPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Digital ID Card</h1>
        <p className="text-[var(--text-muted)]">Show this card at the gate for scanning</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DigitalIdCard />
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold mb-3">ID Card Info</h3>
          <ul className="text-sm text-[var(--text-muted)] space-y-2">
            <li>• Show this screen to the gate operator.</li>
            <li>• The operator scans the QR code to log your entry/exit.</li>
            <li>• Photo verification prevents proxy scanning.</li>
            <li>• If the QR is damaged, the operator can enter your roll manually.</li>
            <li>• For replacement, contact the admin office.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(student)/student/passes/page.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { Ticket, Loader2, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import type { GatePass } from "@/lib/types";

function statusStyle(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return "bg-emerald-500/10 text-emerald-400";
  if (status === "REJECTED") return "bg-rose-500/10 text-rose-400";
  return "bg-amber-500/10 text-amber-400";
}

function statusIcon(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return <CheckCircle2 className="w-3 h-3" />;
  if (status === "REJECTED") return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

export default function StudentPassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
      const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setPasses(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
      const fromIso = from ? new Date(from).toISOString() : new Date().toISOString();
      const toIso = to ? new Date(to).toISOString() : new Date(Date.now() + 8 * 3600 * 1000).toISOString();

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll,
          reason: reason || "Leave",
          from: fromIso,
          to: toIso,
          description,
          requestedById: auth?.user?.id,
          requestedByName: auth?.user?.name,
        }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Pass request submitted. Awaiting parent + admin approval.");
        setReason("");
        setFrom("");
        setTo("");
        setDescription("");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to submit"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Passes</h1>
          <p className="text-[var(--text-muted)]">Manage your gate pass requests</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-primary)] text-white text-sm font-medium hover:brightness-110"
        >
          <Plus className="w-4 h-4" /> New Pass Request
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family function"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">From</label>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {msg && (
        <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[var(--action-primary)]" />
            Pass History
          </h3>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : passes.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No pass requests yet. Use the button above to create one.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {passes.map((pass) => (
              <div key={pass.id} className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium">{pass.reason}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle(pass.finalStatus)}`}>
                    {statusIcon(pass.finalStatus)}
                    <span>{pass.finalStatus}</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {new Date(pass.from).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" → "}
                  {new Date(pass.to).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                {pass.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5 italic">"{pass.description}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(student)/student/page.tsx
````typescript
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { ActivePasses } from "@/components/student/ActivePasses";
import { RecentActivity } from "@/components/student/RecentActivity";

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-[var(--text-muted)]">Your digital ID and campus activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DigitalIdCard />
        <div className="space-y-6">
          <ActivePasses />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(student)/layout.tsx
````typescript
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/(sysadmin)/sysadmin/page.tsx
````typescript
import { GateManagement } from "@/components/sysadmin/GateManagement";
import { UserManagement } from "@/components/sysadmin/UserManagement";
import { SystemSettings } from "@/components/sysadmin/SystemSettings";

export default function SysadminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Administration</h1>
        <p className="text-[var(--text-muted)]">Manage gates, users, and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GateManagement />
        <UserManagement />
      </div>

      <SystemSettings />
    </div>
  );
}
````

## File: gate-monitor/src/app/(sysadmin)/layout.tsx
````typescript
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/api/admin/dashboard/route.ts
````typescript
import { NextResponse } from "next/server";
import { dashboard } from "@/lib/db";

export async function GET() {
  try {
    const data = await dashboard();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load dashboard" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/alerts/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { getAlerts } from "@/lib/db";

/**
 * GET /api/alerts
 * Query params:
 *   resolved=true|false  -> filter by resolution status (omit to get all)
 *   severity=low|medium|high|critical -> filter by severity
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const resolvedParam = params.get("resolved");
    const severity = params.get("severity");

    let data = await getAlerts();
    if (resolvedParam === "true") {
      data = data.filter((a) => a.resolved);
    } else if (resolvedParam === "false") {
      data = data.filter((a) => !a.resolved);
    }
    if (severity) {
      data = data.filter((a) => a.severity === severity);
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load alerts" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/auth/login/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, createSession } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, password } = body || {};

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_CREDENTIALS", message: "Login and password are required" } },
        { status: 400 }
      );
    }

    const user = await verifyLogin(login, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } },
        { status: 401 }
      );
    }

    const token = await signToken(user);
    await createSession(user.id, token, token + "-refresh");

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          gateId: user.gateId,
          employeeId: user.employeeId,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Login failed" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/auth/logout/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      invalidateSession(authHeader.slice(7));
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
````

## File: gate-monitor/src/app/api/auth/pin-login/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyPin, findUserByLogin, createSession } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, pin } = body || {};

    if (!employeeId || !pin) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_CREDENTIALS", message: "Employee ID and PIN are required" } },
        { status: 400 }
      );
    }

    const user = await findUserByLogin(employeeId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!await verifyPin(user.id, pin)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PIN", message: "Invalid PIN" } },
        { status: 401 }
      );
    }

    const token = await signToken(user);
    await createSession(user.id, token, token + "-refresh");

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          gateId: user.gateId,
          employeeId: user.employeeId,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "PIN login failed" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/auth/session/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { getUserForSession } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "NO_TOKEN", message: "No authorization token provided" } },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
        { status: 401 }
      );
    }

    const user = await getUserForSession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NO_SESSION", message: "No active session found" } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          gateId: user.gateId,
          employeeId: user.employeeId,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Session validation failed" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/gate/logs/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { getAllLogs } from "@/lib/db";

/**
 * GET /api/gate/logs
 * Query params:
 *   gateId     = filter by gate id
 *   date       = filter to a specific YYYY-MM-DD (overrides from/to)
 *   from, to   = filter to a date range (YYYY-MM-DD)
 *   direction  = IN | OUT
 *   reason     = exit reason
 *   search     = fuzzy match on roll/name
 *   page       = page number (default 1)
 *   limit      = page size (default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const gateId = params.get("gateId") || undefined;
    const date = params.get("date") || undefined;
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;
    const direction = params.get("direction") || undefined;
    const reason = params.get("reason") || undefined;
    const search = params.get("search") || undefined;
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "50");

    const data = await getAllLogs({ gateId, date, from, to, direction, reason, search, page, limit });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load logs" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gate/logs
 * Bulk insert scans (used by the operator offline-queue flush).
 * Body: { scans: Array<{ roll, direction, reason?, gateId, operatorId, isManual? }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scans } = body;

    if (!Array.isArray(scans)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Expected scans array" } },
        { status: 400 }
      );
    }

    const { addScan } = await import("@/lib/db");
    const results = [];
    for (const scan of scans) {
      try {
        const result = await addScan({
          roll: scan.roll,
          direction: scan.direction,
          reason: scan.reason,
          gateId: scan.gateId,
          operatorId: scan.operatorId,
          isManual: scan.isManual,
        });
        results.push({ local_id: scan.id, status: "success", data: result.scan });
      } catch {
        results.push({ local_id: scan.id, status: "error" });
      }
    }

    return NextResponse.json({ success: true, data: { results } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Bulk sync failed" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/gate/scan/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { addScan, findStudentByRoll, inferDirection, statsToday, findAllGates } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roll, direction, reason, gateId, operatorId, isManual } = body;

    if (!roll) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_STUDENT", message: "Student roll number is required" } },
        { status: 400 }
      );
    }

    const student = await findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STUDENT", message: "Student not found", details: { roll } } },
        { status: 404 }
      );
    }

    if (!direction) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DIRECTION", message: "Direction must be IN or OUT" } },
        { status: 400 }
      );
    }

    if (direction === "OUT" && !reason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_REASON", message: "Reason is required for OUT scans" } },
        { status: 400 }
      );
    }

    const result = await addScan({
      roll,
      direction,
      reason,
      gateId: gateId || "gate-1",
      operatorId: operatorId || "op-1",
      isManual: isManual || false,
    });

    if (result.duplicate) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_SCAN", message: "This student was already scanned recently. Please wait 5 minutes." } },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true, data: result.scan });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to record scan" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await statsToday();
    // Add stats for inference
    const gates = await findAllGates();
    return NextResponse.json({ success: true, data: { ...stats, gates } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load scan stats" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/notifications/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/db";

/**
 * GET /api/notifications
 * Query params:
 *   type = recipient type (parent|student|admin|operator|supervisor|sysadmin|warden)
 *   id   = recipient id (or "all" for broadcast)
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const recipientType = params.get("type") || "parent";
    const recipientId = params.get("id") || "all";

    const data = await getNotifications(recipientType, recipientId);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load notifications" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/passes/[passId]/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { findPass, approvePass, rejectPass } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  const { passId } = await params;
  const pass = await findPass(passId);
  if (!pass) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: pass });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  try {
    const { passId } = await params;
    const body = await req.json();
    const { action, by = "admin", comment = "", approverId } = body;

    const pass = await findPass(passId);
    if (!pass) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } }, { status: 404 });
    }

    let result;
    if (action === "approve") {
      result = await approvePass(passId, by, comment, approverId);
    } else if (action === "reject") {
      if (!comment) {
        return NextResponse.json({ success: false, error: { code: "MISSING_COMMENT", message: "Comment is required for rejection" } }, { status: 400 });
      }
      result = await rejectPass(passId, by, comment, approverId);
    } else {
      return NextResponse.json({ success: false, error: { code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'" } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update pass" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/passes/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { findGatePasses, createGatePass } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    const roll = params.get("roll") || undefined;
    const parentId = params.get("parentId") || undefined;

    const passes = await findGatePasses({ status, roll, parentId });
    return NextResponse.json({ success: true, data: passes });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load passes" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roll, reason, from, to, description, requestedById, requestedByName } = body;

    if (!roll || !reason || !from || !to) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "roll, reason, from, to are required" } },
        { status: 400 }
      );
    }

    const pass = await createGatePass({ roll, reason, from, to, description, requestedById, requestedByName });
    if (!pass) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pass });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create pass" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/students/[roll]/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { findStudentByRoll, getStudentHistory, getStudentStatus } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const roll = params.get("roll");

    if (!roll) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_ROLL", message: "Student roll number is required" } },
        { status: 400 }
      );
    }

    const student = await findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Student with roll ${roll} not found` } },
        { status: 404 }
      );
    }

    const status = await getStudentStatus(roll);
    const history = await getStudentHistory(roll, 20);

    return NextResponse.json({
      success: true,
      data: {
        student,
        campusStatus: status.status,
        lastScan: status.lastScan,
        history,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load student data" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/students/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { findAllStudents, searchStudents, findStudentByRoll } from "@/lib/db";

/**
 * GET /api/students
 * Query params:
 *   roll = exact roll number (returns single student)
 *   q    = search query (returns up to 20 matches)
 *   (no params) = all students
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const roll = params.get("roll");
    const q = params.get("q");

    if (roll) {
      const student = await findStudentByRoll(roll);
      if (!student) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: student });
    }

    if (q) {
      const data = await searchStudents(q);
      return NextResponse.json({ success: true, data });
    }

    const data = await findAllStudents();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load students" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/supervisor/corrections/route.ts
````typescript
import { NextRequest, NextResponse } from "next/server";
import { correctionCandidates, correctScan, getAllGatesLive } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const action = params.get("action");

    if (action === "live") {
      const gates = await getAllGatesLive();
      return NextResponse.json({ success: true, data: gates });
    }

    const candidates = await correctionCandidates();
    return NextResponse.json({ success: true, data: candidates });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load data" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logId, newDirection, newReason, reason, userId, userName, role } = body;

    if (!logId || !newDirection || !reason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "logId, newDirection, and reason are required" } },
        { status: 400 }
      );
    }

    const corrected = await correctScan(logId, newDirection, newReason, reason, userId || "sv-1", userName || "Supervisor", role || "supervisor");
    if (!corrected) {
      return NextResponse.json(
        { success: false, error: { code: "CORRECTION_FAILED", message: "Could not correct scan (may be outside window)" } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: corrected });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Correction failed" } },
      { status: 500 }
    );
  }
}
````

## File: gate-monitor/src/app/api/supervisor/live-events/route.ts
````typescript
import { NextResponse } from "next/server";
import { scansToday } from "@/lib/db";

/**
 * GET /api/supervisor/live-events
 *
 * Returns the most recent scans (today) for the supervisor live feed.
 * Each event has the shape:
 *   {
 *     id: string,
 *     student: { name, rollNumber, avatarUrl },
 *     eventType: "entry" | "exit",
 *     timestamp: string,
 *     gate: { id, name }
 *   }
 */
export async function GET(request: Request) {
  try {
    const today = await scansToday();
    const events = today.slice(0, 50).map((s) => ({
      id: s.id,
      student: {
        name: s.name,
        rollNumber: s.roll,
        avatarUrl: null,
      },
      eventType: s.direction === "IN" ? "entry" : "exit",
      timestamp: s.timestamp,
      gate: {
        id: s.gateId,
        name: s.gateName,
      },
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("live-events error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
````

## File: gate-monitor/src/app/login/layout.tsx
````typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Gate Monitoring",
  description: "Login to the Gate Monitoring System",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="h-screen">{children}</main>;
}
````

## File: gate-monitor/src/app/login/page.tsx
````typescript
"use client";
import { Building2, KeyRound } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-100/50 dark:bg-gray-900/50">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col items-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gray-100 w-16 h-16 dark:bg-gray-900">
            <Building2 className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            JNTUH UCoEJ Gate Monitor
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Select your role to sign in
          </p>
        </div>

        <div className="mt-6">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Select Role
          </label>
          <select
            id="role"
            name="role"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
          >
            <option>Gate Operator</option>
            <option>Gate Supervisor</option>
            <option>Admin</option>
            <option>System Admin</option>
            <option>Parent</option>
            <option>Student</option>
          </select>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <KeyRound className="mr-2 h-5 w-5" />
            Sign in with PIN
          </button>
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/supervisor/corrections/page.tsx
````typescript
import { CorrectionsList } from "@/components/supervisor/CorrectionsList";

export default function CorrectionsPage() {
  return (
    <div>
      <CorrectionsList />
    </div>
  );
}
````

## File: gate-monitor/src/app/supervisor/live/page.tsx
````typescript
import { LiveFeed } from "@/components/supervisor/LiveFeed";

export default function LiveFeedPage() {
  return (
    <div>
      <LiveFeed />
    </div>
  );
}
````

## File: gate-monitor/src/app/supervisor/layout.tsx
````typescript
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/app/globals.css
````css
@import "tailwindcss";

/* ============================================================
   DESIGN TOKENS — Student Gate Monitoring System
   Source of truth: gate-monitor/Plan/UI_Plan_Gate_Monitoring_System.md
   ============================================================ */

/* Inter font is loaded via next/font in layout.tsx. */

:root {
  /* Typography */
  --font-family: "Inter", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* Spacing scale (strict) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Motion */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-success: 1000ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== DARK THEME (Operator / Supervisor / Admin default) ===== */
:root[data-theme="dark"] {
  --bg-base: #0F172A;      /* slate-900 */
  --bg-surface: #1E293B;   /* slate-800 */
  --bg-elevated: #334155;  /* slate-700 */
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --border: #334155;
  --border-strong: #475569;

  --action-primary: #10B981;   /* emerald-500 — Entry / success */
  --action-danger: #EF4444;     /* red-500 — Exit / errors */
  --action-warning: #F59E0B;    /* amber-500 — Day Out / offline */
  --action-info: #3B82F6;       /* blue-500 — Leave / info */
  --focus-ring: #38BDF8;        /* sky-400 */
  --stat-up: #10B981;
  --stat-down: #EF4444;
}

/* ===== LIGHT THEME (Parent / Student) ===== */
:root[data-theme="light"] {
  --bg-base: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-elevated: #FFFFFF;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --border: #E2E8F0;
  --border-strong: #CBD5E1;

  --action-primary: #059669;    /* emerald-600 */
  --action-danger: #DC2626;      /* red-600 */
  --action-warning: #D97706;     /* amber-600 */
  --action-info: #2563EB;        /* blue-600 */
  --focus-ring: #0EA5E9;
  --stat-up: #059669;
  --stat-down: #DC2626;
}

/* ===== SEMANTIC STATUS COLORS (consistent everywhere) ===== */
.status-entry    { color: var(--action-primary); }
.status-exit-home{ color: var(--action-danger); }
.status-exit-day { color: var(--action-warning); }
.status-exit-leave{ color: var(--action-info); }
.status-exiting  { color: var(--action-danger); }

.bg-entry    { background-color: var(--action-primary); }
.bg-exit     { background-color: var(--action-danger); }
.bg-dayout   { background-color: var(--action-warning); }
.bg-leave    { background-color: var(--action-info); }

/* ===== REDUCED MOTION ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ===== BASE ===== */
html {
  scroll-behavior: smooth;
  font-size: 16px;
  -webkit-tap-highlight-color: transparent;
}

body {
  margin: 0;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-family);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Utility: tabular nums for data */
.tabular-nums { font-variant-numeric: tabular-nums; }

/* ===== GLOBAL FOCUS VISIBLE ===== */
*:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
````

## File: gate-monitor/src/app/layout.tsx
````typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JNTUH-UCoEJ Gate Monitor",
  description: "Student Gate Monitoring System — JNTUH University College of Engineering, Nachupally (Kondagattu)",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-[var(--font-family)]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
````

## File: gate-monitor/src/app/page.tsx
````typescript
// Test comment
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  UserCog,
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Building2,
  ScanLine,
} from "lucide-react";
import type { Role } from "@/lib/types";

const ROLES: Array<{
  role: Role;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  href: string;
}> = [
  {
    role: "operator",
    label: "Gate Operator",
    description: "Scan QR codes & record entry/exit",
    icon: <ScanLine className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "hover:border-emerald-500/50",
    href: "/gate/1",
  },
  {
    role: "supervisor",
    label: "Gate Supervisor",
    description: "Review logs, corrections & passes",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "hover:border-sky-500/50",
    href: "/supervisor/live",
  },
  {
    role: "admin",
    label: "Admin",
    description: "Full monitoring, analytics & reports",
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "hover:border-violet-500/50",
    href: "/admin",
  },
  {
    role: "sysadmin",
    label: "System Admin",
    description: "Users, devices, gates & configuration",
    icon: <Settings className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "hover:border-amber-500/50",
    href: "/sysadmin",
  },
  {
    role: "parent",
    label: "Parent",
    description: "Child status, timeline & approvals",
    icon: <Users className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "hover:border-rose-500/50",
    href: "/parent",
  },
  {
    role: "student",
    label: "Student",
    description: "Digital ID, gate passes & history",
    icon: <GraduationCap className="w-6 h-6" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "hover:border-blue-500/50",
    href: "/student",
  },
];

export default function Home() {
  const router = useRouter();

  const handleSelect = (role: Role, href: string) => {
    sessionStorage.setItem("gate-monitor-role", role);
    router.push(href);
  };

  return (
    <main className="flex-1 flex items-center justify-center min-h-screen bg-[var(--bg-base)] p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] mb-4">
            <Building2 className="w-8 h-8 text-[var(--action-primary)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            JNTUH University College of Engineering
          </h1>
          <p className="text-[var(--text-secondary)] text-lg mb-1">
            Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/30">
            <span className="w-2 h-2 rounded-full bg-[var(--action-primary)] animate-pulse" />
            <span className="text-sm font-medium text-[var(--action-primary)]">
              NAAC A+ Accredited · Gate Monitoring System
            </span>
          </div>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((r, i) => (
            <motion.button
              key={r.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => handleSelect(r.role, r.href)}
              className={`group text-left p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] ${r.border} transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${r.bg} ${r.color} mb-4`}>
                {r.icon}
              </div>
              <h3 className="text-lg font-semibold mb-1">{r.label}</h3>
              <p className="text-sm text-[var(--text-muted)]">{r.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors">
                Enter Portal
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-12">
          © 2026 JNTUH-UCoEJ · Digital Campus Management & Monitoring Platform · Module 2: Gate Monitoring
        </p>
      </div>
    </main>
  );
}
````

## File: gate-monitor/src/components/admin/EntryExitChart.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Point = { name: string; entries: number; exits: number };

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

/**
 * Renders the last 7 days of entry/exit activity pulled from /api/gate/logs.
 * The chart re-fetches every 60 seconds so it stays live.
 */
export function EntryExitChart() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Build last-7-day buckets client-side from the 7 most recent days of logs.
        // We pull a generous window (7 days, capped) and aggregate by date.
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = today.toISOString().slice(0, 10);

        const res = await fetch(
          `/api/gate/logs?from=${startStr}&to=${endStr}&limit=5000`,
          { cache: "no-store" }
        );
        const json = await res.json();

        // Initialise empty buckets for the last 7 days
        const buckets: Record<string, { entries: number; exits: number }> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          buckets[d.toISOString().slice(0, 10)] = { entries: 0, exits: 0 };
        }

        const items: any[] = json?.data?.items ?? json?.items ?? [];
        for (const it of items) {
          const day = (it.timestamp ?? "").slice(0, 10);
          if (!buckets[day]) continue;
          if (it.direction === "IN") buckets[day].entries++;
          else if (it.direction === "OUT") buckets[day].exits++;
        }

        const points: Point[] = Object.entries(buckets).map(([day, v]) => ({
          name: fmtDay(new Date(day)),
          entries: v.entries,
          exits: v.exits,
        }));

        if (!cancelled) {
          setData(points);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 h-96">
      <h3 className="font-semibold mb-4">Weekly Entry/Exit</h3>
      {loading ? (
        <div className="h-[80%] flex items-center justify-center text-[var(--text-muted)] text-sm">
          Loading…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <Legend iconSize={10} />
            <Bar dataKey="entries" fill="var(--action-primary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="exits" fill="var(--action-danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/admin/StatCard.tsx
````typescript
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

export function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{trend}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/components/admin/StudentList.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { User, Search } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";

const DEPT_COLORS: Record<string, string> = {
  CSE: "bg-blue-500/20 text-blue-400",
  IT: "bg-purple-500/20 text-purple-400",
  ECE: "bg-emerald-500/20 text-emerald-400",
  EEE: "bg-amber-500/20 text-amber-400",
  ME: "bg-rose-500/20 text-rose-400",
};

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url = query.trim()
          ? `/api/students?q=${encodeURIComponent(query.trim())}`
          : "/api/students";
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setStudents(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    const t = setTimeout(load, 250); // debounce
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center gap-2">
        <div>
          <h3 className="font-semibold">All Students</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {query ? "Search results" : `Total: ${students.length}`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by roll, name, dept…"
            className="pl-10 pr-4 py-2 w-64 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading…</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            {query ? "No matches" : "No students registered"}
          </div>
        ) : (
          students.slice(0, 30).map((student) => {
            const decoded = parseRollNumber(student.roll);
            const branch = decoded?.departmentFullName ?? student.department ?? "—";
            const colorClass =
              DEPT_COLORS[student.department] ?? "bg-slate-500/20 text-slate-400";
            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-[var(--text-muted)] font-mono">{student.roll}</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{branch}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/components/operator/ExitReasonSelector.tsx
````typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExitReason } from "@/lib/types";

interface ExitReasonSelectorProps {
  isOpen: boolean;
  selected?: ExitReason;
  onSelect: (reason: ExitReason) => void;
  onCancel: () => void;
}

const REASONS: { val: ExitReason; label: string; icon: string; color: string }[] = [
  { val: "Home Out", label: "Home Out", icon: "🏠", color: "bg-[var(--action-danger)]" },
  { val: "Day Out", label: "Day Out", icon: "☀️", color: "bg-[var(--action-warning)]" },
  { val: "Leave", label: "Leave", icon: "📝", color: "bg-[var(--action-info)]" },
  { val: "Regular", label: "Regular", icon: "🚶", color: "bg-[var(--action-danger)]" },
];

export function ExitReasonSelector({ isOpen, selected, onSelect, onCancel }: ExitReasonSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Select reason for exit</h3>
            <div className="grid grid-cols-2 gap-3">
              {REASONS.map((r) => (
                <motion.button
                  key={r.val}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(r.val)}
                  className={`h-14 px-3 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 ${r.color} hover:brightness-110 transition-all`}
                >
                  <span>{r.icon}</span>
                  {r.label}
                </motion.button>
              ))}
            </div>
            <button
              onClick={onCancel}
              className="mt-4 w-full h-10 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
````

## File: gate-monitor/src/components/operator/LastScanCard.tsx
````typescript
"use client";

import { COLLEGE } from "@/lib/db";
import type { ScanDirection, ExitReason } from "@/lib/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatTime } from "@/lib/utils";

interface LastScanCardProps {
  lastScan: any | null;
}

export function LastScanCard({ lastScan }: LastScanCardProps) {
  const direction = lastScan?.direction ?? "IN";
  const reason = (lastScan?.reason as ExitReason) || undefined;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">LAST SCAN</p>
      {lastScan ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-base)] flex-shrink-0 flex items-center justify-center">
            {lastScan.student_photo ? (
              <img src={lastScan.student_photo} alt={lastScan.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{direction === "IN" ? "⬇" : "⬆"}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge direction={direction as ScanDirection} reason={reason} size="sm" />
              <span className="font-mono text-xs text-[var(--text-secondary)]">{lastScan.roll}</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{lastScan.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{formatTime(lastScan.timestamp)}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[var(--text-muted)]">
          <p className="text-3xl mb-1">—</p>
          <p className="text-xs">No scan recorded yet</p>
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/operator/ManualEntryDialog.tsx
````typescript
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Info } from "lucide-react";
import { findStudentByRoll, verifyPin, findUserById } from "@/lib/db";
import { parseRollNumber, validateRollNumber } from "@/lib/rollNumber";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ScanDirection, ExitReason } from "@/lib/types";

interface ManualEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gateId: string;
}

const NUMPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"];

export function ManualEntryDialog({ isOpen, onClose, gateId }: ManualEntryDialogProps) {
  const [rollInput, setRollInput] = useState("");
  const [step, setStep] = useState<"keypad" | "confirm" | "pin">("keypad");
  const [student, setStudent] = useState<any>(null);
  const [direction, setDirection] = useState<ScanDirection>("IN");
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [pin, setPin] = useState("");
  const [searching, setSearching] = useState(false);

  // Real-time roll-number validation & decoding
  const rollValid = useMemo(() => (rollInput ? validateRollNumber(rollInput) : false), [rollInput]);
  const rollDecoded = useMemo(() => (rollInput ? parseRollNumber(rollInput) : null), [rollInput]);

  const handleKeyPress = (key: string) => {
    if (key === "⌫") {
      setRollInput((prev) => prev.slice(0, -1));
    } else if (rollInput.length < 10) {
      setRollInput((prev) => prev + key);
    }
  };

  const handleSearch = async () => {
    if (!rollInput.trim()) return;
    setSearching(true);
    const found = await findStudentByRoll(rollInput);
    setSearching(false);
    if (found) {
      setStudent(found);
      setStep("confirm");
    }
  };

  const handleManualScan = () => {
    setStep("pin");
  };

  const handlePinConfirm = async () => {
    if (pin.length !== 4) return;
    const op = await findUserById("op-1");
    if (op && op.pin && await verifyPin(op.id, pin)) {
      // In a real app, this would call the API with isManual=true
      onClose();
      // Reset state
      setRollInput("");
      setStudent(null);
      setStep("keypad");
      setPin("");
    }
  };

  const reset = () => {
    setRollInput("");
    setStudent(null);
    setStep("keypad");
    setPin("");
    setDirection("IN");
    setReason(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manual Entry</h3>
              <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step: Keypad */}
            {step === "keypad" && (
              <>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Enter student roll number (10 characters):
                </p>
                <div className="bg-[var(--bg-base)] border-2 border-[var(--border)] rounded-lg p-3 mb-4 min-h-[48px] flex items-center justify-between">
                  <span className="font-mono text-xl text-[var(--text-primary)]">
                    {rollInput || <span className="text-[var(--text-muted)]">—</span>}
                  </span>
                  {rollInput.length > 0 && (
                    <Info className={`w-5 h-5 ${rollValid ? "text-[var(--action-primary)]" : "text-[var(--action-danger)]"}`} />
                  )}
                </div>

                {/* Decoded roll info (shows when valid) */}
                {rollInput && rollValid && rollDecoded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 p-3 bg-[var(--action-primary)]/5 border border-[var(--action-primary)]/20 rounded-lg"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[var(--text-muted)]">Year</span>
                        <span className="ml-2 text-[var(--text-primary)] font-medium">{rollDecoded.admissionYear}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">College</span>
                        <span className="ml-2 text-[var(--text-primary)] font-medium">{rollDecoded.collegeCode}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Entry Mode</span>
                        <span className="ml-2 text-[var(--text-primary)] font-medium">{rollDecoded.entryModeCode} ({rollDecoded.entryMode})</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Department</span>
                        <span className="ml-2 text-[var(--text-primary)] font-medium">{rollDecoded.departmentCode} ({rollDecoded.department})</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Serial</span>
                        <span className="ml-2 text-[var(--text-primary)] font-medium">{rollDecoded.serial}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Branch</span>
                        <span className="ml-2 text-[var(--text-primary)] font-medium">{rollDecoded.branch}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Invalid roll error */}
                {rollInput && !rollValid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 p-3 bg-[var(--action-danger)]/5 border border-[var(--action-danger)]/20 rounded-lg flex items-start gap-2"
                  >
                    <Info className="w-4 h-4 text-[var(--action-danger)] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--action-danger)]">
                      Roll number must be 10 characters matching the format: YYCCEDBBSS
                      <br />
                      Example: 24JJ1A0201
                    </p>
                  </motion.div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {NUMPAD.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(key)}
                      className="h-12 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-lg font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={!rollInput || !rollValid || searching}
                  className="w-full h-12"
                  loading={searching}
                >
                  {searching ? "Searching..." : "Search Student"}
                </Button>
              </>
            )}

            {/* Step: Confirm student */}
            {step === "confirm" && student && (
              <>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 bg-[var(--bg-base)] flex items-center justify-center">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  <h4 className="font-bold text-lg">{student.name}</h4>
                  <p className="text-[var(--text-secondary)] font-mono text-sm">{student.roll}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {student.department} • Year {student.year}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 uppercase">
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDirection("IN")}
                      className={`h-12 rounded-lg font-medium transition-all ${
                        direction === "IN"
                          ? "bg-[var(--action-primary)] text-white"
                          : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      🟢 ENTRY
                    </button>
                    <button
                      onClick={() => setDirection("OUT")}
                      className={`h-12 rounded-lg font-medium transition-all ${
                        direction === "OUT"
                          ? "bg-[var(--action-danger)] text-white"
                          : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      🔴 EXIT
                    </button>
                  </div>
                </div>

                {direction === "OUT" && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 uppercase">
                      Exit Reason
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Home Out", "Day Out", "Leave", "Regular"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r as ExitReason)}
                          className={`h-12 rounded-lg text-sm font-medium transition-all ${
                            reason === r
                              ? "bg-[var(--action-primary)] text-white"
                              : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep("keypad")} className="flex-1 h-12">
                    Back
                  </Button>
                  <Button onClick={handleManualScan} className="flex-1 h-12">
                    Proceed (PIN Required)
                  </Button>
                </div>
              </>
            )}

            {/* Step: PIN entry */}
            {step === "pin" && (
              <>
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  Enter supervisor PIN to confirm manual entry:
                </p>
                <div className="bg-[var(--bg-base)] border-2 border-[var(--border)] rounded-lg p-3 mb-4 min-h-[48px] flex items-center">
                  <span className="font-mono text-xl text-[var(--text-primary)] tracking-widest">
                    {pin || <span className="text-[var(--text-muted)]">— — — —</span>}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "⌫") {
                          setPin((prev) => prev.slice(0, -1));
                        } else if (pin.length < 4) {
                          setPin((prev) => prev + key);
                        }
                      }}
                      className="h-12 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-lg font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep("confirm")} className="flex-1 h-12">
                    Back
                  </Button>
                  <Button
                    onClick={handlePinConfirm}
                    disabled={pin.length !== 4}
                    className="flex-1 h-12"
                  >
                    Confirm
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
````

## File: gate-monitor/src/components/operator/OperatorStats.tsx
````typescript
"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface OperatorStatsProps {
  entries: number;
  exits: number;
  onCampus: number;
}

export function OperatorStats({ entries, exits, onCampus }: OperatorStatsProps) {
  const cards = [
    { label: "ENTRIES", value: formatNumber(entries), color: "text-[var(--action-primary)]", glow: "shadow-emerald-500/10" },
    { label: "EXITS", value: formatNumber(exits), color: "text-[var(--action-danger)]", glow: "shadow-red-500/10" },
    { label: "ON CAMPUS", value: formatNumber(onCampus), color: "text-[var(--focus-ring)]", glow: "shadow-sky-500/10" },
  ];

  return (
    <>
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center ${card.glow}`}
        >
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-1">{card.label}</p>
          <p className={`text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
        </motion.div>
      ))}
    </>
  );
}
````

## File: gate-monitor/src/components/operator/RecentScans.tsx
````typescript
"use client";
import { User, ArrowRight, ArrowLeft } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";

const DUMMY_SCANS = [
  { id: 1, name: "Akarsh Jadi",   roll: "24JJ1A0501",  status: "entry", time: "10:30 AM" },
  { id: 2, name: "Bhavana",        roll: "24JJ1A0508",  status: "exit",  time: "10:32 AM" },
  { id: 3, name: "Chandu",         roll: "24JJ1A1215",  status: "entry", time: "10:35 AM" },
  { id: 4, name: "Dhana",          roll: "24JJ1A0322",  status: "entry", time: "10:38 AM" },
  { id: 5, name: "Eshwar",         roll: "24JJ1A0429",  status: "exit",  time: "10:40 AM" },
];

const SCANS_WITH_DEPT = DUMMY_SCANS.map((s) => {
  const decoded = parseRollNumber(s.roll);
  return { ...s, department: decoded?.department ?? "??" };
});

export function RecentScans() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Scans</h3>
      <div className="space-y-4">
        {SCANS_WITH_DEPT.map((scan) => (
          <div key={scan.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${scan.status === 'entry' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{scan.name}</p>
                <p className="text-sm text-[var(--text-muted)] font-mono">
                  {scan.roll}
                  <span className="ml-1.5 text-xs font-medium text-[var(--text-secondary)]">[{scan.department}]</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${scan.status === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scan.status === 'entry' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{scan.status === 'entry' ? 'Entry' : 'Exit'}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{scan.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/components/operator/ScanConfirmation.tsx
````typescript
"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";

interface ScanConfirmationProps {
  student: {
    name: string;
    roll: string;
    department: string;
    year: number;
    photo?: string;
  };
  onConfirm: (direction: "IN" | "OUT", reason?: string) => void;
  onCancel: () => void;
  suggestedDirection: "IN" | "OUT";
}

export function ScanConfirmation({ student, onConfirm, onCancel, suggestedDirection }: ScanConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="relative mx-auto w-28 h-28 rounded-full overflow-hidden border-4 border-[var(--border)] mb-4">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
                <User className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold mb-1">{student.name}</h2>
          <p className="text-[var(--text-secondary)] font-mono text-sm">{student.roll}</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {student.department} • Year {student.year}
          </p>

          <p className="text-sm text-[var(--text-muted)] mb-4">ENTRY or EXIT?</p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm("IN")}
              className="h-12 px-4 rounded-lg bg-[var(--action-primary)] text-white font-semibold text-lg hover:brightness-110 transition-all"
            >
              🟢 ENTRY
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm("OUT")}
              className="h-12 px-4 rounded-lg bg-[var(--action-danger)] text-white font-semibold text-lg hover:brightness-110 transition-all"
            >
              🔴 EXIT
            </motion.button>
          </div>

          <button
            onClick={onCancel}
            className="mt-4 w-full h-10 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
````

## File: gate-monitor/src/components/operator/Scanner.tsx
````typescript
"use client";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { QRCode } from "react-qrcode-logo";

export function Scanner() {
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleScan = (data: string | null) => {
    if (data) {
      setScannedData(data);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex flex-col items-center">
      <div className="w-64 h-64 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        {/* Placeholder for QR Code Scanner */}
        <QrCode className="w-24 h-24 text-gray-400 dark:text-gray-600" />
      </div>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        {scannedData ? `Last scan: ${scannedData}` : "Align QR code within frame to scan"}
      </p>
    </div>
  );
}
````

## File: gate-monitor/src/components/operator/ScanViewfinder.tsx
````typescript
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanViewfinderProps {
  onScan: (roll: string) => void;
  scanning: boolean;
  lastScanRoll?: string;
  error?: { code: string; message: string } | null;
}

/**
 * ScanViewfinder — the camera area for the Gate Operator screen.
 * On a real tablet this would use the device camera + QR decoder (e.g.
 * @zxing/browser or react-zxing). For the demo / development build we
 * provide a clickable roll-number palette so the full scan → confirm
 * → success flash flow works end-to-end without a camera.
 */
const SAMPLE_ROLLS = ["21CSE101", "21ECE102", "21IT103", "21EEE104", "21ME105", "21CSE106", "21ECE107"];

export function ScanViewfinder({ onScan, scanning, lastScanRoll, error }: ScanViewfinderProps) {
  return (
    <div className="relative flex-1 min-h-[300px] bg-black rounded-xl overflow-hidden border-2 border-[var(--border)]">
      {/* Camera placeholder */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <Camera className="w-16 h-16 text-[var(--text-muted)]/50" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[var(--text-muted)]">
          <ScanLine className="w-4 h-4 animate-pulse" />
          <span className="text-xs">{scanning ? "Scanning..." : "Camera Active"}</span>
        </div>
      </div>

      {/* Scan Ring reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64">
          {/* Corner brackets */}
          <motion.div
            className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[var(--action-primary)] rounded-tl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[var(--action-primary)] rounded-tr-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[var(--action-primary)] rounded-bl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[var(--action-primary)] rounded-br-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />

          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-[var(--action-primary)]/60"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-white/80 text-sm mb-2">Align QR within frame</p>
            <p className="text-white/50 text-xs">Place student ID card here</p>
          </div>
        </div>
      </div>

      {/* Error overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex items-center justify-center bg-red-500/90"
          >
            <div className="text-center text-white p-6">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="font-bold">{error.code}</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sample roll buttons (demo mode — real app uses camera) */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-surface)]/80 backdrop-blur border-t border-[var(--border)] p-3 flex flex-wrap justify-center gap-2">
        {SAMPLE_ROLLS.map((roll) => (
          <button
            key={roll}
            type="button"
            onClick={() => !scanning && onScan(roll)}
            disabled={scanning || (lastScanRoll === roll)}
            className={cn(
              "px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] transition-all",
              !scanning && lastScanRoll !== roll && "hover:border-[var(--action-primary)] hover:text-[var(--action-primary)]",
              lastScanRoll === roll && "border-[var(--action-primary)] text-[var(--action-primary)]"
            )}
          >
            {roll}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] w-full mt-1">Tap a roll to simulate QR scan</span>
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/components/operator/SuccessFlash.tsx
````typescript
"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export function SuccessFlash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--action-primary)] text-white"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      >
        <CheckCircle className="w-24 h-24" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-2xl font-bold"
      >
        Scan Recorded!
      </motion.p>
    </motion.div>
  );
}
````

## File: gate-monitor/src/components/parent/ChildActivity.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { Scan } from "@/lib/types";

export function ChildActivity() {
  const [activities, setActivities] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [childRoll, setChildRoll] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
        const res = await fetch(`/api/students?parentId=${parentId}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        const kids = Array.isArray(json.data) ? json.data : [];
        // Use the first child for the activity feed (parent page shows top-level summary)
        const first = kids[0];
        if (!first) {
          setLoading(false);
          return;
        }
        setChildRoll(first.roll);
        const r2 = await fetch(`/api/students/${encodeURIComponent(first.roll)}/history?limit=10`, { cache: "no-store" });
        const j2 = await r2.json();
        if (!cancelled) {
          setActivities(Array.isArray(j2.data) ? j2.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading activity…
          </div>
        ) : !childRoll ? (
          <p className="text-sm text-[var(--text-muted)]">No linked students.</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No recent activity.</p>
        ) : (
          activities.map((a) => {
            const isIn = a.direction === "IN";
            const t = new Date(a.timestamp).toLocaleString("en-IN", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={a.id} className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-medium ${isIn ? "text-emerald-500" : "text-rose-500"}`}>
                  {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  <span className="capitalize">{a.direction === "IN" ? "Entry" : "Exit"}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">{t}</p>
                  <p className="text-xs text-gray-400">{a.gateName}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/components/parent/ChildStatus.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Student } from "@/lib/types";

export function ChildStatus() {
  const [children, setChildren] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, { status: "IN" | "OUT"; last: { timestamp: string; gateName: string } | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Get parent ID from auth (demo)
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";

        const res = await fetch(`/api/students?parentId=${parentId}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        const kids: Student[] = Array.isArray(json.data) ? json.data : [];
        setChildren(kids);

        // Get current status for each child
        const stat: Record<string, any> = {};
        await Promise.all(
          kids.map(async (k) => {
            try {
              const r = await fetch(`/api/students/${encodeURIComponent(k.roll)}/status`, { cache: "no-store" });
              const j = await r.json();
              stat[k.roll] = j.data ?? { status: "OUT", last: null };
            } catch {
              stat[k.roll] = { status: "OUT", last: null };
            }
          })
        );
        if (!cancelled) {
          setStatuses(stat);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading children…
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
        No linked students found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {children.map((child) => {
        const st = statuses[child.roll];
        const isIn = st?.status === "IN";
        const lastSeen = st?.last
          ? `${st.last.gateName} • ${new Date(st.last.timestamp).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "No recent activity";
        return (
          <div key={child.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full border-2 border-gray-400 overflow-hidden">
                {child.photo ? (
                  <img src={child.photo} alt={child.name} className="rounded-full w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-semibold">
                    {child.name?.[0] ?? "?"}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">{child.name}</h3>
                <p className="text-sm font-mono text-[var(--text-muted)]">{child.roll}</p>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Last seen: {lastSeen}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-white ${isIn ? "bg-emerald-500" : "bg-rose-500"}`}>
              {isIn ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-semibold">{isIn ? "Inside Campus" : "Outside Campus"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
````

## File: gate-monitor/src/components/parent/RequestPassForm.tsx
````typescript
"use client";
import { useState } from "react";
import { Ticket, Loader2, CheckCircle2 } from "lucide-react";
import type { Student } from "@/lib/types";

const PASS_TYPES = ["Day Pass", "Weekend Pass", "Emergency Leave"] as const;

export function RequestPassForm() {
  const [passType, setPassType] = useState<typeof PASS_TYPES[number]>("Day Pass");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSuccess(null);
    try {
      // Look up the parent's first child
      const authRaw = localStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
      const res = await fetch(`/api/students?parentId=${parentId}`, { cache: "no-store" });
      const json = await res.json();
      const kids: Student[] = Array.isArray(json.data) ? json.data : [];
      const child = kids[0];
      if (!child) {
        setSuccess("❌ No linked student to issue a pass for.");
        setBusy(false);
        return;
      }

      // Build a sensible from/to: now → +duration
      const fromIso = from ? new Date(from).toISOString() : new Date().toISOString();
      let toIso: string;
      if (to) {
        toIso = new Date(to).toISOString();
      } else {
        const t = new Date();
        if (passType === "Day Pass") t.setHours(t.getHours() + 8);
        else if (passType === "Weekend Pass") t.setDate(t.getDate() + 2);
        else t.setHours(t.getHours() + 4);
        toIso = t.toISOString();
      }

      const passRes = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll: child.roll,
          reason: `${passType}${reason ? ` — ${reason}` : ""}`,
          from: fromIso,
          to: toIso,
          description: reason,
          requestedById: auth?.user?.id,
          requestedByName: auth?.user?.name,
        }),
      });
      const passJson = await passRes.json();
      if (passRes.ok && passJson.success) {
        setSuccess("✅ Pass request submitted. Awaiting admin approval.");
        setReason("");
      } else {
        setSuccess(`❌ ${passJson.error?.message ?? "Failed to submit pass"}`);
      }
    } catch {
      setSuccess("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Request a Pass</h3>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="passType" className="block text-sm font-medium text-gray-300">
            Pass Type
          </label>
          <select
            id="passType"
            value={passType}
            onChange={(e) => setPassType(e.target.value as typeof PASS_TYPES[number])}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 py-2 pl-3 pr-10 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
          >
            {PASS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-gray-300">From</label>
            <input
              id="from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm font-medium text-gray-300">To</label>
            <input
              id="to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-700 text-white sm:text-sm p-2 bg-gray-800"
            />
          </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-300">
            Reason
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Optional details for the admin…"
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Ticket className="mr-2 h-5 w-5" />}
          Request Pass
        </button>
        {success && (
          <div className={`text-sm ${success.startsWith("✅") ? "text-emerald-400" : "text-rose-400"} flex items-center gap-1.5`}>
            {success.startsWith("✅") && <CheckCircle2 className="w-4 h-4" />}
            <span>{success}</span>
          </div>
        )}
      </form>
    </div>
  );
}
````

## File: gate-monitor/src/components/shared/Header.tsx
````typescript
"use client";
import { Menu, Bell } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-white/5 rounded-md">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-[var(--text-muted)] hover:bg-white/5 rounded-full">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
````

## File: gate-monitor/src/components/shared/Sidebar.tsx
````typescript
"use client";

import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Building2,
  ScanLine,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { Role } from "@/lib/types";

const NAV_ITEMS = {
  operator: [
    { href: "/gate/1", label: "Gate 1", icon: ScanLine },
    { href: "/gate/2", label: "Gate 2", icon: ScanLine },
  ],
  supervisor: [
    { href: "/supervisor/live", label: "Live Feed", icon: LayoutDashboard },
    { href: "/supervisor/corrections", label: "Corrections", icon: ShieldCheck },
  ],
  admin: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  sysadmin: [{ href: "/sysadmin", label: "Settings", icon: Settings }],
  parent: [{ href: "/parent", label: "Dashboard", icon: Users }],
  student: [{ href: "/student", label: "My ID", icon: GraduationCap }],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const storedRole = sessionStorage.getItem("gate-monitor-role") as Role;
    if (storedRole) {
      setRole(storedRole);
    } else {
      router.push("/");
    }
  }, [router]);

  const navItems = role ? NAV_ITEMS[role] : [];

  const handleLogout = () => {
    sessionStorage.removeItem("gate-monitor-role");
    router.push("/");
  };

  if (!role) {
    return null; // or a loading spinner
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)]">
      <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
        <Building2 className="w-6 h-6 text-[var(--action-primary)]" />
        <span className="font-semibold">Gate Monitor</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                : "text-[var(--text-secondary)] hover:bg-white/5"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">
              {role.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium capitalize">{role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-[var(--text-muted)] hover:bg-white/5"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
````

## File: gate-monitor/src/components/shared/StatusBadge.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ScanDirection, ExitReason } from "@/lib/types";

interface StatusBadgeProps {
  direction: ScanDirection;
  reason?: ExitReason;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function StatusBadge({ direction, reason, className, size = "md" }: StatusBadgeProps) {
  const isEntry = direction === "IN";

  const bgColor = isEntry
    ? "bg-[var(--action-primary)]/10"
    : reason === "Day Out"
    ? "bg-[var(--action-warning)]/10"
    : reason === "Leave"
    ? "bg-[var(--action-info)]/10"
    : "bg-[var(--action-danger)]/10";

  const textColor = isEntry
    ? "text-[var(--action-primary)]"
    : reason === "Day Out"
    ? "text-[var(--action-warning)]"
    : reason === "Leave"
    ? "text-[var(--action-info)]"
    : "text-[var(--action-danger)]";

  const dotColor = isEntry
    ? "bg-[var(--action-primary)]"
    : reason === "Day Out"
    ? "bg-[var(--action-warning)]"
    : reason === "Leave"
    ? "bg-[var(--action-info)]"
    : "bg-[var(--action-danger)]";

  const icon = isEntry ? "⬇" : reason === "Home Out" ? "🏠" : reason === "Day Out" ? "☀️" : reason === "Leave" ? "📝" : "🚶";
  const label = isEntry ? "ENTRY" : reason ? reason.toUpperCase() : "EXIT";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size],
        bgColor,
        textColor,
        className
      )}
    >
      <span className={cn("rounded-full", dotSizes[size], dotColor)} />
      <span className="leading-tight">{icon}</span>
      <span className="leading-tight">{label}</span>
    </span>
  );
}
````

## File: gate-monitor/src/components/student/ActivePasses.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { Ticket, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { GatePass } from "@/lib/types";

function expiryLabel(to: string, status: string): string {
  if (status === "REJECTED") return "Rejected";
  if (status === "PENDING" || status === "APPROVED_PARENT" || status === "APPROVED_ADMIN") return "Awaiting approval";
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `Expires in ${Math.floor(ms / 60_000)} min`;
  if (hours < 24) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function statusStyle(s: string) {
  if (s === "APPROVED" || s === "COMPLETED") return { text: "text-emerald-300", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" /> };
  if (s === "REJECTED") return { text: "text-rose-300", bg: "bg-rose-500/10", icon: <XCircle className="w-8 h-8 text-rose-400" /> };
  return { text: "text-amber-300", bg: "bg-amber-500/10", icon: <Clock className="w-8 h-8 text-amber-400" /> };
}

export function ActivePasses() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setPasses(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Active Passes</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : passes.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">No passes yet.</p>
      ) : (
        <div className="space-y-4">
          {passes.map((pass) => {
            const s = statusStyle(pass.finalStatus);
            return (
              <div key={pass.id} className={`flex items-center gap-4 p-3 rounded-lg ${s.bg}`}>
                {s.icon}
                <div className="flex-1">
                  <p className={`font-medium ${s.text}`}>{pass.reason}</p>
                  <p className={`text-sm ${s.text} opacity-80`}>
                    {expiryLabel(pass.to, pass.finalStatus)}
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                  {pass.finalStatus}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/student/DigitalIdCard.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { QrCode, Loader2 } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";

export function DigitalIdCard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        // Demo: roll from auth or fallback to sample
        const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/students/${encodeURIComponent(roll)}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setStudent(json.data ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex items-center gap-2 text-[var(--text-muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading ID…
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 text-sm text-[var(--text-muted)]">
        Student record not found.
      </div>
    );
  }

  const decoded = parseRollNumber(student.roll);
  const photoSrc = student.photo || "/avatar-placeholder.png";

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex flex-col items-center">
      {/* Student Photo */}
      <div className="relative w-32 h-32 rounded-full mb-4 border-4 border-sky-500 overflow-hidden">
        <img src={photoSrc} alt={student.name} className="rounded-full w-full h-full object-cover" />
      </div>

      {/* Basic Info */}
      <h2 className="text-2xl font-bold">{student.name}</h2>
      <p className="text-[var(--text-secondary)] font-mono text-lg">{student.roll}</p>

      {decoded && (
        <div className="mt-3 px-4 py-2 bg-[var(--bg-base)]/50 rounded-lg text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {decoded.departmentFullName}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {decoded.entryMode} • Batch {decoded.admissionYear}
          </p>
        </div>
      )}

      {/* Roll Number Breakdown */}
      <div className="mt-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase">Roll Number Breakdown</span>
        </div>
        <div className="grid grid-cols-5 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Year</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.yearCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">College</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.collegeCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Entry</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.entryModeCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Dept</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.departmentCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Serial</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.serial ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="mt-6 p-4 bg-white rounded-lg">
        <QRCode value={student.roll} size={160} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1">
        <QrCode className="w-3 h-3" />
        Scan for verification
      </p>
    </div>
  );
}
````

## File: gate-monitor/src/components/student/RecentActivity.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { Scan } from "@/lib/types";

export function RecentActivity() {
  const [activities, setActivities] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/students/${encodeURIComponent(roll)}/history?limit=5`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setActivities(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No activity yet.</p>
        ) : (
          activities.map((a) => {
            const isIn = a.direction === "IN";
            return (
              <div key={a.id} className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-medium ${isIn ? "text-emerald-400" : "text-rose-400"}`}>
                  {isIn ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  <span className="capitalize">{isIn ? "Entry" : "Exit"}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {new Date(a.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{a.gateName}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
````

## File: gate-monitor/src/components/supervisor/CorrectionsList.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { User, AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Scan } from "@/lib/types";

export function CorrectionsList() {
  const [corrections, setCorrections] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/supervisor/corrections", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setCorrections(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load corrections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const startEdit = (scan: Scan) => {
    setEditingId(scan.id);
    setDirection(scan.direction);
    setReason(scan.reason || "");
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
  };

  const saveEdit = async (scan: Scan) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/gate/scan/${scan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, reason, isCorrection: true, originalScanId: scan.id }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Correction saved.");
        load();
        setEditingId(null);
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to save"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold">Flagged Events for Correction</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load corrections</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : corrections.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          No corrections needed.
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {corrections.map((correction) => {
            const rollInfo = parseRollNumber(correction.roll);
            const isEditing = editingId === correction.id;
            return (
              <div key={correction.id} className="p-2 rounded-lg hover:bg-white/5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {correction.name} <span className="text-sm text-[var(--text-muted)] font-mono">({correction.roll})</span>
                      </p>
                      {rollInfo && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          {rollInfo.departmentFullName} • {rollInfo.entryMode} • Batch {rollInfo.admissionYear}
                        </p>
                      )}
                      <p className="text-sm text-amber-400">
                        {correction.isManual ? "Manual entry" : "Flagged for review"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(correction.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {correction.gateName ? ` at ${correction.gateName}` : ""}
                    </p>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={direction}
                          onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
                          className="text-sm bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1"
                        >
                          <option value="IN">Entry</option>
                          <option value="OUT">Exit</option>
                        </select>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason"
                          className="text-sm bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1"
                        />
                        <button
                          onClick={() => saveEdit(correction)}
                          disabled={busy}
                          className="text-sm font-medium text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          {busy ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-sm font-medium text-rose-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(correction)}
                        className="text-sm font-medium text-sky-400 hover:underline"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/supervisor/LiveFeed.tsx
````typescript
"use client";
import { User, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { parseRollNumber } from "@/lib/rollNumber";

// This type definition should match the API contract
type GateEvent = {
  id: string;
  student: {
    name: string;
    rollNumber: string;
    avatarUrl?: string | null;
  };
  eventType: "entry" | "exit";
  timestamp: string;
  gate: {
    id: string;
    name: string;
  };
};

// Decode a roll number into its semantic parts (department, entry mode, year)
function rollSummary(roll: string): string | null {
  const d = parseRollNumber(roll);
  if (!d) return null;
  return `${d.department} • ${d.entryMode} • ${d.admissionYear}`;
}

function SkeletonLoader() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
            <div>
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-4 w-20 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-28 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveFeed() {
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/supervisor/live-events');
        if (!response.ok) {
          throw new Error('Failed to fetch live events.');
        }
        const data = await response.json();
        setEvents(data);
      } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Live Gate Events</h3>
      </div>
      
      {isLoading && <SkeletonLoader />}

      {error && (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load events</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {events.map((event) => {
            const rollInfo = rollSummary(event.student.rollNumber);
            return (
              <div key={event.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.eventType === 'entry' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {/* Placeholder for avatar image */}
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{event.student.name}</p>
                    <p className="text-sm text-[var(--text-muted)] font-mono">{event.student.rollNumber}</p>
                    {rollInfo && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{rollInfo}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center justify-end gap-1.5 text-sm font-medium ${event.eventType === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {event.eventType === 'entry' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    <span className="capitalize">{event.eventType}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]" title={new Date(event.timestamp).toLocaleString()}>
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })} at {event.gate.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/sysadmin/GateManagement.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { DoorOpen, PlusCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Gate } from "@/lib/types";

export function GateManagement() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"main" | "hostel" | "back">("main");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gates", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setGates(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, type, isActive: true }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Gate added.");
        setName("");
        setLocation("");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to add gate"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (gate: Gate) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/gates/${gate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !gate.isActive }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Gate status updated.");
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to update gate"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="font-semibold">Gate Management</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"
        >
          <PlusCircle className="w-5 h-5" />
          Add Gate
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-4 bg-[var(--bg-base)] rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Gate"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. North Campus"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "main" | "hostel" | "back")}
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            >
              <option value="main">Main</option>
              <option value="hostel">Hostel</option>
              <option value="back">Back</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Gate"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading gates…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load gates</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : gates.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          No gates configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {gates.map((gate) => (
            <div key={gate.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <DoorOpen className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{gate.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {gate.location} • {gate.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleActive(gate)}
                  className={`text-sm font-medium px-3 py-1 rounded-full ${gate.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
                >
                  {gate.isActive ? "Active" : "Inactive"}
                </button>
                <button className="text-sm font-medium text-sky-400 hover:underline">Edit</button>
                <button className="text-sm font-medium text-rose-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/sysadmin/SystemSettings.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { Bell, ShieldCheck, Database, Loader2, XCircle } from "lucide-react";
interface SystemConfig {
  notificationsEnabled?: boolean;
  // Add other config fields as needed
}

export function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/config", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setConfig(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (key: string, value: any) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ Settings updated.");
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to update settings"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="font-semibold">System Settings</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load settings</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notification Settings
              </p>
              <p className="text-sm text-[var(--text-muted)]">Configure alert triggers and channels.</p>
            </div>
            <button
              onClick={() => save("notificationsEnabled", !config?.notificationsEnabled)}
              disabled={busy}
              className={`text-sm font-medium px-3 py-1 rounded-full ${config?.notificationsEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
            >
              {config?.notificationsEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Security Policies
              </p>
              <p className="text-sm text-[var(--text-muted)]">Define password strength and session timeouts.</p>
            </div>
            <button className="text-sm font-medium text-sky-400 hover:underline">Manage</button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Database className="w-4 h-4" /> Data Backup
              </p>
              <p className="text-sm text-[var(--text-muted)]">Manage automated data backup and restore points.</p>
            </div>
            <button className="text-sm font-medium text-sky-400 hover:underline">Manage</button>
          </div>
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/sysadmin/UserManagement.tsx
````typescript
"use client";
import { useEffect, useState } from "react";
import { UserPlus, User, Loader2, XCircle } from "lucide-react";
import type { User as UserType } from "@/lib/types";

export function UserManagement() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "supervisor" | "operator" | "parent" | "student">("operator");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, isActive: true }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ User added.");
        setName("");
        setEmail("");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to add user"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (user: UserType) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // No fields to update for now
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setMsg("✅ User updated.");
        load();
      } else {
        setMsg(`❌ ${j.error?.message ?? "Failed to update user"}`);
      }
    } catch {
      setMsg("❌ Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="font-semibold">User Management</h3>
        {msg && <div className={`text-sm ${msg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</div>}
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-4 bg-[var(--bg-base)] rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="block w-full rounded-md border-gray-700 bg-gray-800 text-white sm:text-sm p-2"
            >
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="operator">Operator</option>
              <option value="parent">Parent</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add User"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
        </div>
      ) : error ? (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <XCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-semibold text-lg">Could not load users</h4>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          No users configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {user.email} • {user.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleActive(user)}
                  className="text-sm font-medium px-3 py-1 rounded-full bg-gray-500/10 text-gray-400"
                >
                  Status
                </button>
                <button className="text-sm font-medium text-sky-400 hover:underline">Edit</button>
                <button className="text-sm font-medium text-rose-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
````

## File: gate-monitor/src/components/ui/badge.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "entry"
  | "exit"
  | "dayout"
  | "leave"
  | "offline"
  | "success"
  | "error";

const badgeColors: Record<BadgeVariant, string> = {
  entry: "bg-[var(--action-primary)]/10 text-[var(--action-primary)]",
  exit: "bg-[var(--action-danger)]/10 text-[var(--action-danger)]",
  dayout: "bg-[var(--action-warning)]/10 text-[var(--action-warning)]",
  leave: "bg-[var(--action-info)]/10 text-[var(--action-info)]",
  offline: "bg-[var(--action-warning)]/10 text-[var(--action-warning)]",
  success: "bg-[var(--action-primary)]/10 text-[var(--action-primary)]",
  error: "bg-[var(--action-danger)]/10 text-[var(--action-danger)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "entry", dot = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          badgeColors[variant],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor:
                variant === "entry"
                  ? "var(--action-primary)"
                  : variant === "exit"
                  ? "var(--action-danger)"
                  : variant === "dayout"
                  ? "var(--action-warning)"
                  : variant === "leave"
                  ? "var(--action-info)"
                  : variant === "offline"
                  ? "var(--action-warning)"
                  : variant === "success"
                  ? "var(--action-primary)"
                  : "var(--action-danger)",
            }}
          />
        )}
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
````

## File: gate-monitor/src/components/ui/button.tsx
````typescript
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-[var(--action-primary)] text-white shadow-sm hover:brightness-110",
        secondary: "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)]",
        danger: "bg-[var(--action-danger)] text-white shadow-sm hover:brightness-110",
        ghost: "hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]",
        icon: "h-10 w-10 p-0 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-11 px-4",
        lg: "h-16 px-6 text-lg",
        xl: "h-16 px-8 text-lg rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
````

## File: gate-monitor/src/components/ui/card.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 mb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-3", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardContent };
````

## File: gate-monitor/src/components/ui/input.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helper, error, icon, type, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{icon}</div>}
          <input
            type={type}
            ref={ref}
            className={cn(
              "w-full h-11 px-4 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent",
              icon && "pl-10",
              error && "border-[var(--action-danger)] focus:ring-[var(--action-danger)]",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-[var(--action-danger)] flex items-center gap-1">
            ⚠️ {error}
          </p>
        )}
        {helper && !error && <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
````

## File: gate-monitor/src/components/ui/modal.tsx
````typescript
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  showClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  fullscreen: "w-full h-full m-0 rounded-none",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
}: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl w-full mx-4",
              sizeClasses[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {showClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {title && (
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-xl font-semibold">{title}</h2>
              </div>
            )}
            <div className={cn("p-6", !title && "p-6")}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Modal };
````

## File: gate-monitor/src/components/ui/select.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ options, value, onChange, placeholder = "Select...", error, className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

    return (
      <div className="relative w-full">
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            "w-full h-11 px-4 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
            error && "border-[var(--action-danger)] focus:ring-[var(--action-danger)]",
            disabled && "opacity-40 cursor-not-allowed",
            className
          )}
        >
          <span className={value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
            {selectedLabel}
          </span>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        {open && (
          <div className="absolute top-12 z-20 w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-elevated)] transition-colors",
                  value === opt.value && "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-1 text-sm text-[var(--action-danger)]">⚠️ {error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
````

## File: gate-monitor/src/components/ui/skeleton.tsx
````typescript
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-[var(--border)] animate-pulse rounded-md", className)} {...props} />;
}
Skeleton.displayName = "Skeleton";
````

## File: gate-monitor/src/components/ui/table.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  className?: string;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  emptyMessage?: string;
};

function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  rowKey,
  className,
  pagination,
  onPageChange,
  loading = false,
  emptyMessage = "No records found",
}: TableProps<T>) {
  const getRowValue = (row: T, col: Column<T>): any => {
    const val = row[col.key as keyof T];
    if (col.render) return col.render(row);
    return val;
  };

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--text-muted)]">
                {loading ? "Loading..." : emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-[var(--border)]/40 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-[var(--bg-elevated)]/40"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-[var(--text-primary)]">
                    {getRowValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pagination && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]/40 text-xs text-[var(--text-muted)]">
          <span>
            {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="px-2">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.limit >= pagination.total}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Table };
export type { Column, TableProps };
````

## File: gate-monitor/src/components/ui/tabs.tsx
````typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => {
  return (
    <div className={cn("flex border-b border-[var(--border)]", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative",
            activeTab === tab.id
              ? "text-[var(--action-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          )}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--action-primary)] rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export { Tabs };
````

## File: gate-monitor/src/components/ui/toast.tsx
````typescript
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const toastIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
};

const toastStyles: Record<ToastVariant, string> = {
  success: "bg-[var(--action-primary)]/10 border-[var(--action-primary)]/30 text-[var(--action-primary)]",
  error: "bg-[var(--action-danger)]/10 border-[var(--action-danger)]/30 text-[var(--action-danger)]",
  info: "bg-[var(--action-info)]/10 border-[var(--action-info)]/30 text-[var(--action-info)]",
  warning: "bg-[var(--action-warning)]/10 border-[var(--action-warning)]/30 text-[var(--action-warning)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const duration = toast.duration ?? 4000;
      const newToast: ToastData = { ...toast, id, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const clearAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {ctx.toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm max-w-sm",
              toastStyles[t.variant]
            )}
          >
            {toastIcons[t.variant]}
            <div className="flex-1">
              {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button
              onClick={() => ctx.removeToast(t.id)}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
````

## File: gate-monitor/src/hooks/useApi.ts
````typescript
/**
 * useApi hook — typed wrapper around fetch() that auto-attaches the JWT
 * token from the auth store, handles JSON, and returns typed responses.
 */
"use client";

import { useAuthStore } from "@/stores/authStore";
import type { ApiResponse } from "@/lib/types";

export function useApi() {
  const { token } = useAuthStore();

  const request = async <T = any>(
    input: string | URL,
    init?: RequestInit
  ): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(input, { ...init, headers });
    const data = await res.json();
    return data as ApiResponse<T>;
  };

  const get = (url: string) => request(url, { method: "GET" });
  const post = (url: string, body: any) =>
    request(url, { method: "POST", body: JSON.stringify(body) });
  const put = (url: string, body: any) =>
    request(url, { method: "PUT", body: JSON.stringify(body) });
  const del = (url: string) => request(url, { method: "DELETE" });

  return { request, get, post, put, del };
}
````

## File: gate-monitor/src/hooks/useAuth.ts
````typescript
/**
 * useAuth hook — wraps the auth store for convenient access in React components.
 * Handles auto-login with seeded credentials for demo mode.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

const DEMO_CREDENTIALS: Record<Role, { login: string; password: string }> = {
  operator: { login: "OP001", password: "1234" },
  supervisor: { login: "SV001", password: "3456" },
  admin: { login: "AD001", password: "1234" },
  sysadmin: { login: "SA001", password: "1234" },
  parent: { login: "PA001", password: "1234" },
  student: { login: "stu-1", password: "password" },
};

export function useAuth() {
  const { user, token, role, authenticated, loading, login, pinLogin, logout, setRole } = useAuthStore();
  const router = useRouter();

  /**
   * Auto-login for demo mode — logs in as the given role using seeded credentials.
   * In production this would be replaced by a proper login form / SSO.
   */
  const loginAsRole = async (targetRole: Role) => {
    const creds = DEMO_CREDENTIALS[targetRole];
    if (!creds) {
      // For student role, we need to handle it differently since students aren't in the users table
      // Fall back to a parent-like auto-auth
      const fakeUser = {
        id: "pa-1",
        name: "Demo User",
        role: targetRole as Role,
        gateId: undefined,
        employeeId: undefined,
      } as any;
      setRole(targetRole);
      // For student/parent roles that aren't in users table, we create a minimal session
      // The API routes will still work with the SQLite DB
      localStorage.setItem("gate-monitor-token", "demo-token");
      localStorage.setItem("gate-monitor-role", targetRole);
      localStorage.setItem("gate-monitor-user", JSON.stringify(fakeUser));
      return true;
    }

    const result = await login(creds.login, creds.password);
    if (result.success) {
      return true;
    }
    return false;
  };

  const requireAuth = (allowedRoles?: Role[]) => {
    if (!authenticated) {
      router.push("/login");
      return false;
    }
    if (allowedRoles && !allowedRoles.includes(role as Role)) {
      router.push("/");
      return false;
    }
    return true;
  };

  return {
    user,
    token,
    role,
    authenticated,
    loading,
    login,
    pinLogin,
    logout,
    loginAsRole,
    requireAuth,
  };
}
````

## File: gate-monitor/src/lib/auth.ts
````typescript
/**
 * Authentication & session helpers for the Gate Monitoring System.
 */
import { jwtVerify, SignJWT } from "jose";
import { randomUUID } from "crypto";
import type { User } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "gate-monitor-secret-key-change-in-production-2026"
);

export async function signToken(user: User): Promise<string> {
  return new SignJWT({ uid: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ uid: string; role: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { uid: payload.uid as string, role: payload.role as string, name: payload.name as string };
  } catch {
    return null;
  }
}

export async function getSessionUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const decoded = await verifyToken(token);
  if (!decoded) return null;
  const { findUserById } = await import("./db");
  return findUserById(decoded.uid);
}

export function generateTokens(): { accessToken: string; refreshToken: string } {
  return {
    accessToken: randomUUID().replace(/-/g, ""),
    refreshToken: randomUUID().replace(/-/g, ""),
  };
}
````

## File: gate-monitor/src/lib/db.ts
````typescript
import { supabase } from './supabaseClient';
import { randomUUID } from "crypto";

import type {
  Department, DepartmentCode, Gate, Student, Scan, ScanDirection, ExitReason,
  GatePass, GatePassStatus, Alert, AlertSeverity, AuditEntry,
  User, DashboardData, Role,
} from "./types";

/* ------------------------------------------------------------------ *
 *  COLLEGE DATA
 * ------------------------------------------------------------------ */
export const COLLEGE = {
  name: "JNTUH University College of Engineering, Nachupally (Kondagattu)",
  shortName: "JNTUH-UCoEJ",
  address: "JNTUH University College of Engineering, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501",
  logo: "🏛️",
  accreditation: "NAAC A+ Grade",
  website: "https://jntuhcej.ac.in/",
  principal: "Dr. G. Narsimha",
};

export async function resolveAlert(alertId: string, userId: string): Promise<boolean> {
  const { data: user } = await supabase.from('users').select('name').eq('id', userId).single();
  const { error } = await supabase
    .from('alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error resolving alert:', error);
    return false;
  }

  await addAudit({
    action: 'ALERT_RESOLVED',
    userId,
    userName: user?.name ?? 'Unknown',
    role: 'admin',
    details: `Resolved alert ${alertId}`,
  });

  return true;
}

export const DEPARTMENTS: Department[] = [
  { code: "CSE", name: "Computer Science & Engineering", hod: "Dr. K. Sridhar" },
  { code: "IT",  name: "Information Technology",        hod: "Dr. P. Sreedhar" },
  { code: "ECE", name: "Electronics & Communication Engineering", hod: "Dr. M. Srinivas" },
  { code: "EEE", name: "Electrical & Electronics Engineering",    hod: "Dr. K. Ramesh" },
  { code: "ME",  name: "Mechanical Engineering",          hod: "Dr. R. Mahesh" },
];

export const GATES: Gate[] = [
  { id: "gate-1", name: "Gate 1 (Main)",      location: "Main Entrance",    type: "main",   isActive: true },
  { id: "gate-2", name: "Gate 2 (Hostel)",    location: "Hostel Side",      type: "hostel", isActive: true },
  { id: "gate-3", name: "Gate 3 (Back Gate)", location: "Back Side",        type: "back",   isActive: false },
];

type Reason = ExitReason;

/* ------------------------------------------------------------------ *
 *  MAPPERS
 * ------------------------------------------------------------------ */
function mStu(r: any): Student { return { id: r.id, roll: r.roll, name: r.name, department: r.department, year: r.year, section: r.section, batch: r.batch, photo: r.photo, email: r.email, phone: r.phone, parentName: r.parent_name, parentPhone: r.parent_phone, parentId: r.parent_id, qrCode: r.qr_code, idValidUntil: r.id_valid_until, status: r.status }; }
function mUser(r: any): User { return { id: r.id, employeeId: r.employee_id, name: r.name, email: r.email, phone: r.phone, role: r.role, gateId: r.gate_id || undefined, pin: r.pin, parentId: r.parent_id || undefined }; }
function mScan(r: any): Scan { return { id: r.id, roll: r.roll, name: r.name, department: r.department, year: r.year, direction: r.direction, reason: r.reason, gateId: r.gate_id, gateName: r.gate_name, operatorId: r.operator_id, operatorName: r.operator_name, timestamp: r.timestamp, isManual: !!r.is_manual, isCorrection: !!r.is_correction, originalScanId: r.original_scan_id || undefined }; }
function mPass(r: any): GatePass { return { id: r.id, roll: r.roll, studentName: r.student_name, department: r.department, reason: r.reason, from: r.from_datetime, to: r.to_datetime, description: r.description, requestedById: r.requested_by_id, requestedByName: r.requested_by_name, requestedAt: r.requested_at, parentStatus: r.parent_status, adminStatus: r.admin_status, finalStatus: r.final_status, parentComment: r.parent_comment, adminComment: r.admin_comment, parentApproverId: r.parent_approver_id, adminApproverId: r.admin_approver_id, qrCode: r.qr_code }; }
function mAlert(r: any): Alert { return { id: r.id, severity: r.severity, title: r.title, message: r.message, gateId: r.gate_id, studentRoll: r.student_roll, timestamp: r.timestamp, resolved: !!r.resolved }; }

export async function findPass(passId: string): Promise<GatePass | null> {
  const { data, error } = await supabase
    .from('gate_passes')
    .select('*')
    .eq('id', passId)
    .single();

  if (error || !data) {
    console.error('Error finding pass:', error);
    return null;
  }

  return mPass(data);
}

export async function approvePass(passId: string, role: string, comment: string = "", approverId: string): Promise<boolean> {
  // Determine which status field to update based on role
  const updateField = role === 'parent' ? 'parent_status' : 'admin_status';
  const commentField = role === 'parent' ? 'parent_comment' : 'admin_comment';
  const approverField = role === 'parent' ? 'parent_approver_id' : 'admin_approver_id';

  const statusValue = 'APPROVED';

  // First read the pass to compute new final_status
  const { data: pass, error: readErr } = await supabase
    .from('gate_passes')
    .select('*')
    .eq('id', passId)
    .single();

  if (readErr || !pass) {
    console.error('Error reading pass for approval:', readErr);
    return false;
  }

  const newParentStatus = role === 'parent' ? statusValue : pass.parent_status;
  const newAdminStatus = role === 'admin' ? statusValue : pass.admin_status;
  const finalStatus =
    newParentStatus === 'APPROVED' && newAdminStatus === 'APPROVED'
      ? 'APPROVED'
      : newParentStatus === 'REJECTED' || newAdminStatus === 'REJECTED'
      ? 'REJECTED'
      : newParentStatus === 'APPROVED' || newAdminStatus === 'APPROVED'
      ? (newParentStatus === 'APPROVED' ? 'APPROVED_PARENT' : 'APPROVED_ADMIN')
      : 'PENDING';

  const { error } = await supabase
    .from('gate_passes')
    .update({
      [updateField]: statusValue,
      [commentField]: comment,
      [approverField]: approverId,
      final_status: finalStatus,
    })
    .eq('id', passId);

  if (error) {
    console.error('Error approving pass:', error);
    return false;
  }

  const { data: user } = await supabase.from('users').select('name').eq('id', approverId).single();
  await addAudit({
    action: `GATE_PASS_APPROVED_${role.toUpperCase()}`,
    userId: approverId,
    userName: user?.name ?? 'Unknown',
    role,
    details: `Approved gate pass ${passId}${comment ? ` — ${comment}` : ''}`,
  });

  // Notify student
  const { data: stu } = await supabase.from('students').select('id, parent_id, name').eq('roll', pass.roll).single();
  if (stu) {
    await addNotification(
      'student',
      stu.id,
      'gate_pass',
      'Gate Pass Update',
      `Your gate pass has been ${role === 'parent' ? 'approved by parent' : 'approved by admin'} (${finalStatus}).`
    );
    if (stu.parent_id) {
      await addNotification(
        'parent',
        stu.parent_id,
        'gate_pass',
        'Gate Pass Update',
        `Gate pass for ${stu.name} was ${role === 'parent' ? 'approved by parent' : 'approved by admin'}.`
      );
    }
  }

  return true;
}

export async function rejectPass(passId: string, role: string, comment: string = "", approverId?: string): Promise<boolean> {
  const updateField = role === 'parent' ? 'parent_status' : 'admin_status';
  const commentField = role === 'parent' ? 'parent_comment' : 'admin_comment';
  const approverField = role === 'parent' ? 'parent_approver_id' : 'admin_approver_id';

  const { error } = await supabase
    .from('gate_passes')
    .update({
      [updateField]: 'REJECTED',
      [commentField]: comment,
      [approverField]: approverId,
      final_status: 'REJECTED',
    })
    .eq('id', passId);

  if (error) {
    console.error('Error rejecting pass:', error);
    return false;
  }

  if (approverId) {
    const { data: user } = await supabase.from('users').select('name').eq('id', approverId).single();
    await addAudit({
      action: `GATE_PASS_REJECTED_${role.toUpperCase()}`,
      userId: approverId,
      userName: user?.name ?? 'Unknown',
      role,
      details: `Rejected gate pass ${passId} — ${comment}`,
    });
  }

  return true;
}

export async function createGatePass(passData: {
  roll: string;
  reason: string;
  from: string;
  to: string;
  description?: string;
  requestedById?: string;
  requestedByName?: string;
}): Promise<GatePass | null> {
  // Look up student for derived fields
  const { data: stu, error: stuErr } = await supabase
    .from('students')
    .select('id, name, department, parent_id')
    .eq('roll', passData.roll.trim().toUpperCase())
    .single();

  if (stuErr || !stu) {
    console.error('Student not found for pass creation:', stuErr);
    return null;
  }

  const id = `pass-${randomUUID()}`;
  const qrPayload = JSON.stringify({ id, roll: passData.roll });

  const { data, error } = await supabase
    .from('gate_passes')
    .insert([
      {
        id,
        student_id: stu.id,
        roll: passData.roll.toUpperCase(),
        student_name: stu.name,
        department: stu.department,
        reason: passData.reason,
        from_datetime: passData.from,
        to_datetime: passData.to,
        description: passData.description ?? null,
        requested_by_id: passData.requestedById ?? null,
        requested_by_name: passData.requestedByName ?? null,
        parent_status: 'PENDING',
        admin_status: 'PENDING',
        final_status: 'PENDING',
        qr_code: qrPayload,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating gate pass:', error);
    return null;
  }

  // Notify parent & admin
  if (stu.parent_id) {
    await addNotification(
      'parent',
      stu.parent_id,
      'gate_pass',
      'New Gate Pass Request',
      `${stu.name} requested a gate pass (${passData.reason}) from ${passData.from} to ${passData.to}. Please review.`
    );
  }
  await addNotification(
    'admin',
    'all',
    'gate_pass',
    'New Gate Pass Request',
    `${stu.name} (${passData.roll}) requested a gate pass (${passData.reason}).`
  );

  return mPass(data);
}

export async function findGatePasses(filters: {
  status?: string;
  roll?: string;
  parentId?: string;
  studentId?: string;
} = {}): Promise<GatePass[]> {
  let query = supabase.from('gate_passes').select('*').order('requested_at', { ascending: false });

  if (filters.status) {
    query = query.eq('final_status', filters.status);
  }
  if (filters.roll) {
    query = query.eq('roll', filters.roll.toUpperCase());
  }
  if (filters.parentId) {
    // Filter by parent of the student
    const { data: stu } = await supabase.from('students').select('id').eq('parent_id', filters.parentId);
    const ids = (stu ?? []).map((s: any) => s.id);
    if (ids.length === 0) return [];
    query = query.in('student_id', ids);
  }
  if (filters.studentId) {
    query = query.eq('student_id', filters.studentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error finding gate passes:', error);
    return [];
  }

  return (data ?? []).map(mPass);
}

export async function correctionCandidates(): Promise<Scan[]> {
  // Eligible for correction: scans within the last hour, not already corrected
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .gte('timestamp', oneHourAgo)
    .eq('is_correction', false)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error loading correction candidates:', error);
    return [];
  }

  return (data ?? []).map(mScan);
}

export async function correctScan(originalScanId: string, newDirection: ScanDirection, newReason: ExitReason | undefined, reason: string, userId: string, userName: string, role: string): Promise<Scan | null> {
  // 1. Read the original scan
  const { data: original, error: readErr } = await supabase
    .from('gate_logs')
    .select('*')
    .eq('id', originalScanId)
    .single();

  if (readErr || !original) {
    console.error('Original scan not found:', readErr);
    return null;
  }

  // 2. Reject corrections outside 1-hour window
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if (original.timestamp < oneHourAgo) {
    console.warn('Scan outside correction window');
    return null;
  }

  // 3. Insert a NEW scan row that supersedes the original
  const newId = `scan-${randomUUID()}`;
  const ts = new Date().toISOString();
  const { data: newScan, error: insErr } = await supabase
    .from('gate_logs')
    .insert([
      {
        id: newId,
        student_id: original.student_id,
        roll: original.roll,
        name: original.name,
        department: original.department,
        year: original.year,
        direction: newDirection,
        reason: newReason ?? null,
        gate_id: original.gate_id,
        gate_name: original.gate_name,
        operator_id: userId,
        operator_name: userName,
        timestamp: ts,
        is_manual: 1,
        is_correction: true,
        original_scan_id: originalScanId,
        correction_reason: reason,
      },
    ])
    .select()
    .single();

  if (insErr || !newScan) {
    console.error('Error inserting corrected scan:', insErr);
    return null;
  }

  // 4. Update campus_occupancy to reflect the new direction
  if (original.student_id) {
    await supabase.from('campus_occupancy').upsert(
      {
        student_id: original.student_id,
        current_status: newDirection,
        last_gate_id: original.gate_id,
        last_log_id: newId,
        last_updated: ts,
      },
      { onConflict: 'student_id' }
    );
  }

  // 5. Audit
  await addAudit({
    action: 'SCAN_CORRECTED',
    userId,
    userName,
    role,
    details: `Corrected scan ${originalScanId} (${original.direction} → ${newDirection}). Reason: ${reason}`,
    gateId: original.gate_id,
  });

  return mScan(newScan);
}

export async function getAllGatesLive(): Promise<Gate[]> {
  // Combine persisted gates + activity counts from today's scans
  const gates = await findAllGates();
  const today = await scansToday();

  return gates.map((g) => ({
    ...g,
    // The Gate type from `findAllGates` doesn't include these, but the route extends it
    currentScanCount: today.filter((s) => s.gateId === g.id).length,
    lastScan: today.find((s) => s.gateId === g.id) ?? null,
  })) as any;
}

export async function getAlerts(resolved?: boolean): Promise<Alert[]> {
  let query = supabase.from('alerts').select('*').order('timestamp', { ascending: false });
  if (resolved !== undefined) {
    query = query.eq('resolved', resolved);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error loading alerts:', error);
    return [];
  }
  return (data ?? []).map(mAlert);
}

export async function getNotifications(recipientType: string, recipientId: string): Promise<Alert[]> {
  // 'all' is a wildcard (e.g. for admin broadcast)
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_type', recipientType)
    .order('created_at', { ascending: false })
    .limit(50);

  if (recipientId !== 'all') {
    query = query.eq('recipient_id', recipientId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
  // Re-map to Alert shape (notifications table has no severity/gate/student_roll — use defaults)
  return (data ?? []).map((n: any) => ({
    id: n.id,
    severity: 'info' as AlertSeverity,
    title: n.title,
    message: n.message,
    gateId: undefined,
    studentRoll: undefined,
    timestamp: n.created_at,
    resolved: !!n.read,
  }));
}

export async function getUserForSession(sessionId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('users(*)')
    .eq('id', sessionId)
    .eq('active', true)
    .single();

  if (error || !data) {
    console.error('Error loading session user:', error);
    return null;
  }
  return data.users ? mUser(data.users) : null;
}

export async function createSession(userId: string, token: string, refreshToken: string): Promise<string | null> {
  const id = `sess-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('sessions').insert([
    {
      id,
      user_id: userId,
      token,
      refresh_token: refreshToken,
      active: true,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }
  return id;
}

export async function invalidateSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update({ active: false, invalidated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
  return true;
}

function toStuAny(r: any) { return r; }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — STUDENTS
 * ------------------------------------------------------------------ */
export async function findStudentByRoll(rollNum: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('roll', rollNum.trim().toUpperCase())
    .single();

  if (error) {
    console.error('Error finding student by roll:', error);
    return null;
  }

  return data ? mStu(data) : null;
}

export async function findAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('roll');

  if (error) {
    console.error('Error finding all students:', error);
    return [];
  }

  return data.map(mStu);
}

export async function searchStudents(q: string): Promise<Student[]> {
  const s = `%${q.toLowerCase()}%`;
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`roll.ilike.${s},name.ilike.${s},department.ilike.${s}`)
    .limit(20);

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data.map(mStu);
}
export async function findByQr(payload: string): Promise<Student | null> { return findStudentByRoll(payload.trim().toUpperCase().replace(/\s+/g, "")); }
export async function getStudentByRoll(rollNum: string): Promise<Student | null> { return findStudentByRoll(rollNum); }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — GATES
 * ------------------------------------------------------------------ */
export async function findGateById(id: string): Promise<Gate | null> {
  const { data, error } = await supabase
    .from('gates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error finding gate by id:', error);
    return null;
  }

  return data ? { id: data.id, name: data.name, location: data.location, type: data.type, isActive: !!data.is_active } : null;
}

export async function findAllGates(): Promise<Gate[]> {
  const { data, error } = await supabase
    .from('gates')
    .select('*');

  if (error) {
    console.error('Error finding all gates:', error);
    return [];
  }

  return data.map((r) => ({ id: r.id, name: r.name, location: r.location, type: r.type, isActive: !!r.is_active }));
}

/* ------------------------------------------------------------------ *
 *  PUBLIC API — USERS & AUTH
 * ------------------------------------------------------------------ */
export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error finding user by id:', error);
    return null;
  }

  return data ? mUser(data) : null;
}

export async function findUserByLogin(login: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`employee_id.eq.${login.trim()},email.eq.${login.trim()},name.eq.${login.trim()}`)
    .single();

  if (error) {
    console.error('Error finding user by login:', error);
    return null;
  }

  return data ? mUser(data) : null;
}

import bcrypt from 'bcryptjs';

export async function verifyLogin(login: string, password: string): Promise<User | null> {
  const user = await findUserByLogin(login);
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    console.error('Error verifying login:', error);
    return null;
  }

  const isMatch = await bcrypt.compare(password, data.password_hash);
  return isMatch ? user : null;
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('pin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error verifying pin:', error);
    return false;
  }

  return data.pin === pin;
}

/* ------------------------------------------------------------------ *
 *  PUBLIC API — SCANS
 * ------------------------------------------------------------------ */
export async function lastScanFor(roll: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .eq('roll', roll)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error getting last scan for roll:', error);
    return null;
  }

  return data ? mScan(data) : null;
}

export async function scansToday(): Promise<Scan[]> {
  const t = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .gte('timestamp', `${t}T00:00:00.000Z`)
    .lte('timestamp', `${t}T23:59:59.999Z`)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error getting scans for today:', error);
    return [];
  }

  return data.map(mScan);
}
export async function studentsInside(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('campus_occupancy')
    .select('students(*)')
    .eq('current_status', 'IN');

  if (error) {
    console.error('Error getting students inside:', error);
    return [];
  }

  return data.map((d: any) => mStu(d.students));
}

export async function campusCount(): Promise<number> {
  const { count, error } = await supabase
    .from('campus_occupancy')
    .select('*', { count: 'exact', head: true })
    .eq('current_status', 'IN');

  if (error) {
    console.error('Error getting campus count:', error);
    return 0;
  }

  return count || 0;
}

export async function isDuplicate(roll: string, direction: ScanDirection, min = 5): Promise<boolean> {
  const cutoff = new Date(Date.now() - min * 60000).toISOString();
  const { data, error } = await supabase
    .from('gate_logs')
    .select('id')
    .eq('roll', roll)
    .eq('direction', direction)
    .gte('timestamp', cutoff)
    .limit(1)
    .single();

  if (error) {
    // Ignore error if it's because no rows were found
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('Error checking for duplicate scan:', error);
  }

  return !!data;
}

export async function inferDirection(roll: string): Promise<ScanDirection> {
  const l = await lastScanFor(roll);
  return l ? (l.direction === "IN" ? "OUT" : "IN") : "IN";
}

export async function addScan(input: {
  roll: string;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  operatorId: string;
  isManual?: boolean;
  timestamp?: string;
}): Promise<{ scan: Scan | null; duplicate: boolean }> {
  const stu = await findStudentByRoll(input.roll);
  if (!stu) throw new Error("STUDENT_NOT_FOUND");

  if (await isDuplicate(input.roll, input.direction)) {
    return { scan: null, duplicate: true };
  }

  const gate = (await findGateById(input.gateId)) ?? GATES[0];
  const op = (await findUserById(input.operatorId)) ?? { id: "op-1", name: "M. Ramu", role: "operator" as const };
  const ts = input.timestamp ?? new Date().toISOString();
  const id = `scan-${randomUUID()}`;

  const { data, error } = await supabase
    .from('gate_logs')
    .insert([
      {
        id,
        student_id: stu.id,
        roll: stu.roll,
        name: stu.name,
        department: stu.department,
        year: stu.year,
        direction: input.direction,
        reason: input.reason ?? null,
        gate_id: gate.id,
        gate_name: gate.name,
        operator_id: op.id,
        operator_name: op.name,
        timestamp: ts,
        is_manual: input.isManual ? 1 : 0,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error adding scan:', error);
    return { scan: null, duplicate: false };
  }

  // Upsert into campus_occupancy
  const { error: occError } = await supabase.from('campus_occupancy').upsert(
    {
      student_id: stu.id,
      current_status: input.direction,
      last_gate_id: gate.id,
      last_log_id: id,
      last_updated: ts,
    },
    { onConflict: 'student_id' }
  );

  if (occError) {
    console.error('Error updating campus occupancy:', occError);
    // Don't fail the whole operation, just log the error
  }

  await addAudit({
    action: "SCAN_CREATED",
    userId: op.id,
    userName: op.name,
    role: op.role as Role,
    details: `${input.direction} ${stu.name} (${stu.roll}) at ${gate.name}`,
    gateId: gate.id,
  });

  await addNotification(
    "parent",
    stu.parentId ?? "pa-1",
    "gate_entry",
    "Gate Entry",
    `${stu.name} (${stu.roll}) ${
      input.direction === "IN" ? "entered" : "exited"
    } campus at ${new Date(ts).toLocaleTimeString()} via ${gate.name}`
  );

  return { scan: mScan(data), duplicate: false };
}

export async function getAllLogs(f?: {
  gateId?: string;
  date?: string;
  from?: string;
  to?: string;
  direction?: string;
  reason?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  let query = supabase.from('gate_logs').select('*', { count: 'exact' });

  if (f?.gateId) {
    query = query.eq('gate_id', f.gateId);
  }
  if (f?.date) {
    query = query.gte('timestamp', `${f.date}T00:00:00.000Z`);
    query = query.lte('timestamp', `${f.date}T23:59:59.999Z`);
  } else {
    if (f?.from) {
      query = query.gte('timestamp', `${f.from}T00:00:00.000Z`);
    }
    if (f?.to) {
      query = query.lte('timestamp', `${f.to}T23:59:59.999Z`);
    }
  }
  if (f?.direction) {
    query = query.eq('direction', f.direction);
  }
  if (f?.reason) {
    query = query.eq('reason', f.reason);
  }
  if (f?.search) {
    const s = `%${f.search.toLowerCase()}%`;
    query = query.or(`roll.ilike.${s},name.ilike.${s}`);
  }

  const page = f?.page || 1;
  const limit = f?.limit || 50;
  const offset = (page - 1) * limit;

  query = query.range(offset, offset + limit - 1).order('timestamp', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error getting all logs:', error);
    return { items: [], total: 0, page, limit, totalPages: 0 };
  }

  const total = count || 0;
  return {
    items: data.map(mScan),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


async function addAudit(input: {
  action: string;
  userId: string;
  userName: string;
  role: string;
  details: string;
  gateId?: string;
}) {
  const { error } = await supabase.from('audit_logs').insert([
    {
      action: input.action,
      user_id: input.userId,
      user_name: input.userName,
      role: input.role,
      details: input.details,
      gate_id: input.gateId,
    },
  ]);

  if (error) {
    console.error('Error adding audit log:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  NOTIFICATIONS
 * ------------------------------------------------------------------ */
export async function addNotification(
  recipientType: string,
  recipientId: string,
  type: string,
  title: string,
  message: string
) {
  const { error } = await supabase.from('notifications').insert([
    {
      recipient_type: recipientType,
      recipient_id: recipientId,
      type,
      title,
      message,
    },
  ]);

  if (error) {
    console.error('Error adding notification:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  DASHBOARD
 * ------------------------------------------------------------------ */
export async function dashboard(): Promise<DashboardData> {
  const tsc = await scansToday();
  const ins = tsc.filter((s) => s.direction === "IN").length;
  const outs = tsc.filter((s) => s.direction === "OUT").length;
  const inside = await studentsInside();

  // Fetch real alerts (unresolved) and pending passes in parallel
  const [alerts, passes, gates] = await Promise.all([
    getAlerts(false),
    findGatePasses({ status: 'PENDING' }),
    findAllGates(),
  ]);

  // Real per-gate activity
  const locs: Array<Gate & { currentScanCount: number; lastScan: Scan | null }> = gates.map((g) => {
    const gateScans = tsc.filter((s) => s.gateId === g.id);
    return {
      ...g,
      currentScanCount: gateScans.length,
      lastScan: gateScans[0] ?? null,
    } as any;
  });

  // Department breakdown from today's scans
  const deptStats: Record<string, { in: number; out: number }> = {};
  for (const s of tsc) {
    const d = s.department || 'Unknown';
    if (!deptStats[d]) deptStats[d] = { in: 0, out: 0 };
    if (s.direction === 'IN') deptStats[d].in++;
    else deptStats[d].out++;
  }
  const total = tsc.length || 1;
  const deptBreakdown = Object.entries(deptStats).map(([dept, { in: inC, out: outC }]) => ({
    dept,
    deptCode: dept,
    in: inC,
    out: outC,
    pct: Math.round(((inC + outC) / total) * 100),
  }));

  // Trend comparison vs yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().slice(0, 10);
  const { data: yScans } = await supabase
    .from('gate_logs')
    .select('direction')
    .gte('timestamp', `${yDate}T00:00:00.000Z`)
    .lte('timestamp', `${yDate}T23:59:59.999Z`);
  const yIn = (yScans ?? []).filter((s: any) => s.direction === 'IN').length;
  const yOut = (yScans ?? []).filter((s: any) => s.direction === 'OUT').length;

  const fmtTrend = (today: number, yest: number) => {
    if (yest === 0) return today > 0 ? `+${today} vs yesterday` : '0 vs yesterday';
    const diff = today - yest;
    if (diff === 0) return 'Same as yesterday';
    return `${diff > 0 ? '+' : ''}${diff} vs yesterday`;
  };

  return {
    onCampus: inside.length,
    todayIn: ins,
    todayOut: outs,
    totalScans: tsc.length,
    activeAlerts: alerts.length,
    trendOnCampus: inside.length > 0 ? `+${inside.length} currently inside` : 'Empty campus',
    trendOut: fmtTrend(outs, yOut),
    trendScans: fmtTrend(tsc.length, (yIn + yOut)),
    locations: locs,
    activityFeed: tsc.slice(0, 20),
    deptBreakdown,
    alerts,
    gatePasses: passes,
  };
}

/* ------------------------------------------------------------------ */
export async function statsToday(): Promise<{ entries: number; exits: number; onCampus: number; lastScan: Scan | null; recentScans: Scan[] }> {
  const t = await scansToday();
  return { entries: t.filter((s) => s.direction === "IN").length, exits: t.filter((s) => s.direction === "OUT").length, onCampus: await campusCount(), lastScan: t[0] ?? null, recentScans: t.slice(0, 5) };
}

/* ------------------------------------------------------------------ *
 *  STUDENT STATUS & HISTORY (for parent/student views)
 * ------------------------------------------------------------------ */
export async function getStudentStatus(roll: string): Promise<{ status: "IN" | "OUT"; lastScan: Scan | null; name?: string }> {
  const { data, error } = await supabase
    .from('campus_occupancy')
    .select('current_status, last_log_id')
    .eq('student_id', `(select id from students where roll = '${roll}')`)
    .single();

  if (error || !data) {
    return { status: "OUT", lastScan: null };
  }
  
  const lastScan = await lastScanFor(roll);
  return { status: data.current_status as "IN" | "OUT", lastScan, name: lastScan?.name };
}

export async function getStudentHistory(roll: string, limit: number = 20): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .eq('roll', roll)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting student history:', error);
    return [];
  }

  return data.map(mScan);
}

export async function getParentChildren(parentId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', parentId)
    .order('roll');

  if (error) {
    console.error('Error getting parent children:', error);
    return [];
  }

  return data.map(mStu);
}

export default {};
````

## File: gate-monitor/src/lib/rollNumber.ts
````typescript
/**
 * Roll Number Parser & Decoder
 *
 * Decodes the 10-character JNTUH hall-ticket / roll-number schema:
 *
 *   ┌──────┬─────────┬────────────┬─────────────┬──────────┐
 *   │  25  │   JJ    │     5A     │     12      │    03    │
 *   └──────┴─────────┴────────────┴─────────────┴──────────┘
 *    Year  College  Entry/Degree  Department  Sequence
 *    (2)   (2 α)    (2 αnum)      (2 digits)  (2 αnum)
 *
 * Reference: SEMANTICS_GATE_MONITOR.md § roll-number structural blueprint
 *            + user-provided decoding model.
 */

/* ------------------------------------------------------------------ *
 *  TYPE DEFINITIONS
 * ------------------------------------------------------------------ */

export type CollegeCode = "JJ"; // JNTUH University College of Engineering Jagtial (UCEJ)
export type EntryModeCode = "1A" | "5A"; // Regular B.Tech | Lateral Entry B.Tech
export type RollDeptCode = "02" | "03" | "04" | "05" | "12"; // EEE | ME | ECE | CSE | IT

export interface CollegeInfo {
  code: CollegeCode;
  name: string;
  shortName: string;
}

export interface EntryModeInfo {
  code: EntryModeCode;
  label: string;
  description: string;
  durationYears: number;
}

export interface RollNumberDecoded {
  /** Full raw roll number string (e.g. "24JJ1A0201") */
  raw: string;
  /** Full 4-digit admission year (e.g. 2024) */
  admissionYear: number;
  /** Last 2 digits of admission year (e.g. 24) */
  yearCode: string;
  /** College code (e.g. "JJ") */
  collegeCode: CollegeCode;
  /** College display name */
  collegeName: string;
  /** College short name */
  collegeShortName: string;
  /** Entry mode code (e.g. "1A") */
  entryModeCode: EntryModeCode;
  /** Entry mode label (e.g. "Regular B.Tech") */
  entryMode: string;
  /** Entry mode description */
  entryModeDescription: string;
  /** Department code as it appears in roll (e.g. "02", "12") */
  departmentCode: string;
  /** Department short name (e.g. "EEE", "CSE") */
  department: string;
  /** Department full name (e.g. "Electrical & Electronics Engineering") */
  departmentFullName: string;
  /** Full human-readable department + entry label */
  branch: string;
  /** Student serial index within the batch+dept+entry group */
  serial: string;
  /** Parsed integer serial (when numeric) */
  serialNumber?: number;
}

/* ------------------------------------------------------------------ *
 *  CONSTANTS
 * ------------------------------------------------------------------ */

/**
 * College codes used in positions 3–4 of the roll number.
 * Reference: the decoding model specifies `JJ` → JNTUH UCEJ.
 */
export const COLLEGE_CODES: Record<string, CollegeInfo> = {
  JJ: {
    code: "JJ",
    name: "JNTUH University College of Engineering Jagtial (UCEJ)",
    shortName: "JNTUH-UCEJ",
  },
};

/**
 * Entry-mode / degree codes used in positions 5–6 of the roll number.
 * Reference: the decoding model specifies:
 *   `1A` → Regular 4-Year B.Tech (1st year entry)
 *   `5A` → Lateral Entry B.Tech (2nd year / 3rd semester entry)
 */
export const ENTRY_MODE_CODES: Record<string, EntryModeInfo> = {
  "1A": {
    code: "1A",
    label: "Regular B.Tech",
    description: "Regular 4-Year B.Tech (Joined in 1st year)",
    durationYears: 4,
  },
  "5A": {
    code: "5A",
    label: "Lateral Entry B.Tech",
    description: "Lateral Entry B.Tech (Joined directly into 2nd year / 3rd semester)",
    durationYears: 3,
  },
};

/**
 * Department codes used in positions 7–8 of the roll number.
 *
 * **Important:** These numeric codes differ from the internal `DEPARTMENT_CODES`
 * mapping in types.ts. The roll-number schema uses a different numbering:
 *   02 → EEE, 03 → ME, 04 → ECE, 05 → CSE, 12 → IT
 *
 * Reference: user-provided decoding model.
 */
export const ROLL_DEPT_CODES: Record<string, { short: string; full: string }> = {
  "02": { short: "EEE", full: "Electrical & Electronics Engineering" },
  "03": { short: "ME",  full: "Mechanical Engineering" },
  "04": { short: "ECE", full: "Electronics & Communication Engineering" },
  "05": { short: "CSE", full: "Computer Science & Engineering" },
  "12": { short: "IT",  full: "Information Technology" },
};

/**
 * Regex that validates the 10-character roll-number structure.
 *
 * Breakdown:
 *   ^(\d{2})       – YY: 2 digits (year)
 *   ([A-Z]{2})     – CC: 2 uppercase letters (college)
 *   ([0-9A-Z]{2})  – ED: 2 alphanumeric (entry/degree)
 *   (\d{2})        – BB: 2 digits (department)
 *   ([0-9A-Z]{2})  – SS: 2 alphanumeric (serial)
 *   $
 */
export const ROLL_NUMBER_REGEX = /^(\d{2})([A-Z]{2})([0-9A-Z]{2})(\d{2})([0-9A-Z]{2})$/;

/* ------------------------------------------------------------------ *
 *  CORE FUNCTIONS
 * ------------------------------------------------------------------ */

/**
 * Parse a 10-character roll number (hall ticket number) into its
 * structural components.
 *
 * Follows the 5-part composite schema:
 *   YY CC ED BB SS
 *
 * @param roll - The raw roll number string (case-insensitive).
 * @returns Decoded `RollNumberDecoded` object, or `null` if the roll
 *          number does not match the expected schema.
 *
 * @example
 * ```ts
 * const decoded = parseRollNumber("24JJ1A0201");
 * // { admissionYear: 2024, college: "JJ (UCEJ)", entryMode: "1A (Regular B.Tech)",
 * //   department: "02 (EEE)", serial: "01" }
 *
 * const decoded2 = parseRollNumber("25JJ5A1203");
 * // { admissionYear: 2025, entryMode: "5A (Lateral Entry)",
 * //   department: "12 (IT)", serial: "03" }
 * ```
 */
export function parseRollNumber(roll: string | null | undefined): RollNumberDecoded | null {
  if (!roll) return null;

  const normalized = roll.trim().toUpperCase().replace(/\s+/g, "");

  const match = normalized.match(ROLL_NUMBER_REGEX);
  if (!match) return null;

  const [, yearCode, collegeCode, entryModeCode, deptCode, serial] = match;

  // Validate college code
  const collegeInfo = COLLEGE_CODES[collegeCode];
  if (!collegeInfo) return null;

  // Validate entry mode
  const entryInfo = ENTRY_MODE_CODES[entryModeCode as EntryModeCode];
  if (!entryInfo) return null;

  // Validate department code
  const deptInfo = ROLL_DEPT_CODES[deptCode];
  if (!deptInfo) return null;

  // Compute full admission year (2000–2099 range)
  const yearNum = parseInt(yearCode, 10);
  const admissionYear = 2000 + yearNum;

  // Try to parse serial as number
  const serialNumber = /^\d{2}$/.test(serial) ? parseInt(serial, 10) : undefined;

  return {
    raw: normalized,
    admissionYear,
    yearCode,
    collegeCode: collegeCode as CollegeCode,
    collegeName: collegeInfo.name,
    collegeShortName: collegeInfo.shortName,
    entryModeCode: entryModeCode as EntryModeCode,
    entryMode: entryInfo.label,
    entryModeDescription: entryInfo.description,
    departmentCode: deptCode,
    department: deptInfo.short,
    departmentFullName: deptInfo.full,
    branch: `${deptInfo.short} — ${entryInfo.label}`,
    serial,
    serialNumber,
  };
}

/**
 * Validate whether a string is a well-formed roll number.
 *
 * @param roll - The raw roll number string.
 * @returns `true` if the roll number matches the 10-character schema
 *          **and** every component is a recognised code.
 */
export function validateRollNumber(roll: string | null | undefined): boolean {
  return parseRollNumber(roll) !== null;
}

/**
 * Reconstruct a roll-number string from its decoded components.
 *
 * @param decoded - A partial or complete `RollNumberDecoded`.
 * @returns The 10-character roll number string.
 */
export function formatRollNumber(decoded: Partial<RollNumberDecoded>): string {
  const parts: string[] = [
    decoded.yearCode ?? "",
    decoded.collegeCode ?? "",
    decoded.entryModeCode ?? "",
    decoded.departmentCode ?? "",
    decoded.serial ?? "",
  ];
  return parts.join("");
}

/**
 * Convenience: extract just the department code from a roll number,
 * resolving it to the internal department short-name.
 *
 * This bridges the roll-number department codes (e.g. "02", "12")
 * to the system's internal department short names (e.g. "EEE", "IT").
 *
 * @param roll - The raw roll number string.
 * @returns Department short-name (e.g. "EEE", "CSE") or `null`.
 */
export function getDepartmentFromRoll(roll: string | null | undefined): string | null {
  const decoded = parseRollNumber(roll);
  return decoded ? decoded.department : null;
}

/**
 * Convenience: extract the admission year from a roll number.
 *
 * @param roll - The raw roll number string.
 * @returns Full 4-digit year (e.g. 2024) or `null`.
 */
export function getAdmissionYearFromRoll(roll: string | null | undefined): number | null {
  const decoded = parseRollNumber(roll);
  return decoded ? decoded.admissionYear : null;
}

/**
 * Convenience: extract the student's year of study from a roll number.
 *
 * For a regular student (1A), year of study = current year - admission year + 1.
 * For lateral entry students (5A), the same formula applies but the
 * effective programme is 3 years.
 *
 * @param roll   - The raw roll number string.
 * @param now    - Optional override for "today" (defaults to `new Date()`).
 * @returns Year of study (1–4) or `null` if the roll is unparseable.
 */
export function getStudentYearFromRoll(roll: string | null | undefined, now: Date = new Date()): number | null {
  const decoded = parseRollNumber(roll);
  if (!decoded) return null;
  const currentYear = now.getFullYear();
  const yearOfStudy = currentYear - decoded.admissionYear + 1;
  return yearOfStudy > 0 ? yearOfStudy : 1;
}

/**
 * Build a human-readable description of a roll number.
 *
 * @param roll - The raw roll number string.
 * @returns A description like `"2024 • JJ (UCEJ) • Regular B.Tech • EEE • Student 01"`,
 *          or `"Invalid roll number"` if parsing fails.
 */
export function describeRollNumber(roll: string | null | undefined): string {
  const decoded = parseRollNumber(roll);
  if (!decoded) return "Invalid roll number";

  return [
    decoded.admissionYear,
    `JJ (${decoded.collegeShortName})`,
    decoded.entryMode,
    decoded.department,
    `Student ${decoded.serial}`,
  ].join(" • ");
}

/* ------------------------------------------------------------------ *
 *  DEFAULTS
 * ------------------------------------------------------------------ */

/** Default roll numbers for demo / testing purposes. */
export const SAMPLE_ROLL_NUMBERS: string[] = [
  "24JJ1A0201", // 2024, UCEJ, Regular, EEE, #01
  "24JJ1A0501", // 2024, UCEJ, Regular, CSE, #01
  "24JJ1A1201", // 2024, UCEJ, Regular, IT, #01
  "24JJ1A0401", // 2024, UCEJ, Regular, ECE, #01
  "24JJ1A0301", // 2024, UCEJ, Regular, ME, #01
  "25JJ5A1203", // 2025, UCEJ, Lateral Entry, IT, #03
  "25JJ1A0512", // 2025, UCEJ, Regular, CSE, #12
  "24JJ5A0307", // 2024, UCEJ, Lateral Entry, ME, #07
];
````

## File: gate-monitor/src/lib/supabaseClient.ts
````typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
````

## File: gate-monitor/src/lib/types.ts
````typescript
export type Role =
  | "operator"
  | "supervisor"
  | "admin"
  | "sysadmin"
  | "parent"
  | "student"
  | "warden";

export interface User {
  id: string;
  name: string;
  role: Role;
  gateId?: string;
  employeeId?: string;
  email?: string;
  phone?: string;
  pin?: string;
  parentId?: string;
  supervisedGates?: string[];
  assignedHostel?: string;
  isHod?: boolean;
  departmentId?: string;
  canViewGender?: string[];
}

export type ExitReason = "Home Out" | "Day Out" | "Leave" | "Regular";

export type StudentType = "HM" | "HF" | "DM" | "DF";

export type ScanDirection = "IN" | "OUT";

export interface Student {
  id: string;
  roll: string;
  name: string;
  department: string;
  year: number;
  section: string;
  batch: string;
  photo: string;
  email: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  parentId: string;
  qrCode: string;
  idValidUntil: string;
  status: string;
  studentType?: StudentType;
  gender?: "male" | "female";
  hostelBlock?: string;
  roomNumber?: string;
  hostelCurfewTime?: string;
  wardenId?: string;
}

export interface Department {
  code: string;
  name: string;
  hod: string;
}

export type DepartmentCode = string;

export interface Gate {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
}

export interface Scan {
  id: string;
  roll: string;
  name: string;
  department: string;
  year: number;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  gateName: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
  isManual: boolean;
  isCorrection: boolean;
  originalScanId?: string;
}

export interface GatePass {
  id: string;
  roll: string;
  studentName: string;
  department: string;
  reason: ExitReason;
  from: string;
  to: string;
  description?: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  parentStatus: GatePassStatus;
  adminStatus: GatePassStatus;
  finalStatus: GatePassStatus;
  parentComment?: string;
  adminComment?: string;
  parentApproverId?: string;
  adminApproverId?: string;
  qrCode: string;
}

export type GatePassStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPROVED_PARENT" | "APPROVED_ADMIN" | "COMPLETED";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  gateId?: string;
  studentRoll?: string;
  timestamp: string;
  resolved: boolean;
}

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  role: Role;
  timestamp: string;
  details: string;
  gateId?: string;
}

export interface DashboardData {
  onCampus: number;
  todayIn: number;
  todayOut: number;
  totalScans: number;
  activeAlerts: number;
  trendOnCampus: string;
  trendOut: string;
  trendScans: string;
  locations: Array<Gate & { currentScanCount: number; lastScan: Scan | null }>;
  activityFeed: Scan[];
  deptBreakdown: Array<{
    dept: string;
    deptCode: DepartmentCode;
    in: number;
    out: number;
    pct: number;
  }>;
  alerts: Alert[];
  gatePasses: GatePass[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ExitReasonConfig {
  code: ExitReason;
  name: string;
  description: string;
  applicableTo: StudentType[];
  maxDurationHours?: number;
  requiresApproval: boolean;
  approvalBy?: "warden" | "faculty" | "admin" | "none";
  parentNotification: "silent" | "push" | "sms" | "urgent";
  autoApproveTimeRange?: string;
}

export const EXIT_REASON_CONFIGS: ExitReasonConfig[] = [
  { code: "Regular", name: "Regular", description: "Regular exit/entry", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "silent" },
  { code: "Home Out", name: "Home Out", description: "Going home for overnight/weekend", applicableTo: ["HM", "HF"], maxDurationHours: 48, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Day Out", name: "Day Out", description: "Full day outing", applicableTo: ["HM", "HF"], maxDurationHours: 8, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Leave", name: "Leave", description: "Leave application (covers medical, events, and other special cases)", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: true, approvalBy: "faculty", parentNotification: "push" },
];

export const STUDENT_TYPE_RULES: Record<StudentType, {
  curfew?: string;
  shortOutingMax: number;
  dayOutMax: number;
  homeOutMax: number;
  allowedExitReasons: ExitReason[];
  mustExitBy?: string;
}> = {
  HM: { curfew: "21:00", shortOutingMax: 3, dayOutMax: 8, homeOutMax: 48, allowedExitReasons: ["Regular", "Home Out", "Day Out", "Leave"] },
  HF: { curfew: "18:30", shortOutingMax: 2, dayOutMax: 6, homeOutMax: 48, allowedExitReasons: ["Regular", "Home Out", "Day Out", "Leave"] },
  DM: { shortOutingMax: 0, dayOutMax: 0, homeOutMax: 0, allowedExitReasons: ["Regular", "Leave"], mustExitBy: "17:30" },
  DF: { shortOutingMax: 0, dayOutMax: 0, homeOutMax: 0, allowedExitReasons: ["Regular", "Leave"], mustExitBy: "17:30" },
};

export const DEPARTMENT_CODES: Record<string, string> = {
  "01": "CSE",
  "02": "IT",
  "03": "ECE",
  "04": "EEE",
  "05": "ME",
};

export const DEPARTMENT_CODE_TO_NAME: Record<string, string> = {
  "01": "Computer Science & Engineering",
  "02": "Information Technology",
  "03": "Electronics & Communication Engineering",
  "04": "Electrical & Electronics Engineering",
  "05": "Mechanical Engineering",
};
````

## File: gate-monitor/src/lib/utils.ts
````typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ScanDirection, ExitReason } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getDirectionColor(direction: ScanDirection): string {
  return direction === "IN" ? "var(--action-primary)" : "var(--action-danger)";
}

export function getDirectionLabel(direction: ScanDirection): string {
  return direction === "IN" ? "ENTRY" : "EXIT";
}

export function getReasonColor(reason?: ExitReason): string {
  switch (reason) {
    case "Home Out": return "var(--action-danger)";
    case "Day Out": return "var(--action-warning)";
    case "Leave": return "var(--action-info)";
    default: return "var(--action-danger)";
  }
}

export function getReasonIcon(reason?: ExitReason): string {
  switch (reason) {
    case "Home Out": return "🏠";
    case "Day Out": return "☀️";
    case "Leave": return "📝";
    default: return "🚶";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "IN": return "var(--action-primary)";
    case "OUT": return "var(--action-danger)";
    case "PENDING": return "var(--action-warning)";
    case "APPROVED": return "var(--action-primary)";
    case "REJECTED": return "var(--action-danger)";
    case "EXPIRED": return "var(--text-muted)";
    default: return "var(--text-muted)";
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getAvatarColor(name: string): string {
  const colors = [
    "bg-emerald-500/20 text-emerald-400",
    "bg-sky-500/20 text-sky-400",
    "bg-violet-500/20 text-violet-400",
    "bg-rose-500/20 text-rose-400",
    "bg-amber-500/20 text-amber-400",
    "bg-blue-500/20 text-blue-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
````

## File: gate-monitor/src/stores/adminStore.ts
````typescript
/**
 * Zustand store for the Admin dashboard — KPIs, activity feed, alerts, gate passes.
 */
import { create } from "zustand";
import { dashboard, getAlerts, resolveAlert, getNotifications } from "@/lib/db";
import type { DashboardData, Alert, Scan } from "@/lib/types";

interface AdminState {
  dashboardData: DashboardData | null;
  alerts: Alert[];
  unreadNotifications: number;
  liveActivity: Scan[];
  activeGate: string | null;
  loading: boolean;
}

interface AdminActions {
  loadDashboard: () => void;
  loadAlerts: () => void;
  resolveAlert: (alertId: string, userId: string, userName: string) => void;
  recordScan: (scan: Scan) => void;
  setActiveGate: (gateId: string | null) => void;
  refresh: () => void;
}

export const useAdminStore = create<AdminState & AdminActions>()((set, get) => ({
  dashboardData: null,
  alerts: [],
  unreadNotifications: 0,
  liveActivity: [],
  activeGate: null,
  loading: false,

  loadDashboard: async () => {
    const data = await dashboard();
    set({ dashboardData: data, liveActivity: data.activityFeed });
  },

  loadAlerts: async () => {
    const alerts = await getAlerts(true);
    set({ alerts });
  },

  resolveAlert: async (alertId, userId, userName) => {
    await resolveAlert(alertId, userId);
    get().loadAlerts();
    get().loadDashboard();
  },

  recordScan: (scan) => {
    set((state) => ({
      liveActivity: [scan, ...state.liveActivity.slice(0, 49)],
    }));
  },

  setActiveGate: (gateId) => set({ activeGate: gateId }),

  refresh: () => {
    get().loadDashboard();
    get().loadAlerts();
  },
}));
````

## File: gate-monitor/src/stores/authStore.ts
````typescript
/**
 * Zustand auth store — manages JWT token, user info, and role in localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/types";
import { signToken } from "@/lib/auth";
import { findUserByLogin, verifyLogin, verifyPin, createSession, invalidateSession } from "@/lib/db";

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  authenticated: boolean;
  loading: boolean;
}

interface AuthActions {
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  pinLogin: (employeeId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      authenticated: false,
      loading: false,

      login: async (login, password) => {
        set({ loading: true });
        const user = await verifyLogin(login, password);
        if (!user) {
          set({ loading: false });
          return { success: false, error: "Invalid credentials" };
        }
        const token = await signToken(user);
        await createSession(user.id, token, token + "-refresh");
        set({ user, token, role: user.role as Role, authenticated: true, loading: false });
        return { success: true };
      },

      pinLogin: async (employeeId, pin) => {
        set({ loading: true });
        const user = await findUserByLogin(employeeId);
        if (!user || user.role !== "operator") {
          set({ loading: false });
          return { success: false, error: "User not found" };
        }
        if (!user.pin || !(await verifyPin(user.id, pin))) {
          set({ loading: false });
          return { success: false, error: "Invalid PIN" };
        }
        const token = await signToken(user);
        await createSession(user.id, token, token + "-refresh");
        set({ user, token, role: "operator", authenticated: true, loading: false });
        return { success: true };
      },

      logout: async () => {
        const token = get().token;
        if (token) await invalidateSession(token);
        localStorage.removeItem("gate-monitor-token");
        localStorage.removeItem("gate-monitor-auth");
        set({ user: null, token: null, role: null, authenticated: false });
        window.location.href = "/";
      },

      setRole: (role) => set({ role }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "gate-monitor-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        authenticated: state.authenticated,
      }),
    }
  )
);
````

## File: gate-monitor/src/stores/operatorStore.ts
````typescript
/**
 * Zustand store for the Gate Operator screen state.
 * Manages scan flow: detecting → confirming → reason selection → success.
 */
import { create } from "zustand";
import { inferDirection, findStudentByRoll, addScan, isDuplicate, statsToday, findGateById } from "@/lib/db";
import type { Scan, Student, Gate, ScanDirection, ExitReason } from "@/lib/types";

type ScanState = "idle" | "detecting" | "confirming" | "selecting_reason" | "success" | "error";

interface OperatorState {
  // Current scan flow
  state: ScanState;
  currentStudent: Student | null;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  photoVerificationDone: boolean;

  // Data
  lastScan: Scan | null;
  todaysStats: { entries: number; exits: number; onCampus: number } | null;
  recentScans: Scan[];
  gate: Gate | null;

  // Errors
  error: { code: string; message: string } | null;

  // Offline queue
  offlineQueue: Array<{ id: string; roll: string; direction: ScanDirection; reason?: ExitReason }>;
  isOnline: boolean;

  // Actions
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason) => void;
  confirmScan: () => void;
  cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
  flushOfflineQueue: () => void;
  setOnline: (online: boolean) => void;
}

export const useOperatorStore = create<OperatorState>()((set, get) => ({
  state: "idle",
  currentStudent: null,
  selectedDirection: "IN",
  selectedReason: null,
  photoVerificationDone: false,

  lastScan: null,
  todaysStats: null,
  recentScans: [],
  gate: null,

  error: null,

  offlineQueue: [],
  isOnline: true,

  startScan: async (roll) => {
    const student = await findStudentByRoll(roll);
    if (!student) {
      set({
        state: "error",
        error: { code: "INVALID_QR", message: "Invalid QR code. Please contact administration." },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    // Check ID expiry
    if (student.idValidUntil && new Date(student.idValidUntil) < new Date()) {
      set({
        state: "error",
        error: { code: "EXPIRED_ID", message: "Student ID card has expired. Please renew at the administration office." },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    const direction = await inferDirection(roll);
    set({
      state: "confirming",
      currentStudent: student,
      selectedDirection: direction,
      selectedReason: null,
      photoVerificationDone: false,
      error: null,
    });
  },

  setDirection: (direction) => {
    const { currentStudent } = get();
    if (!currentStudent) return;
    set({ selectedDirection: direction, selectedReason: null });
  },

  setReason: (reason) => {
    set({ selectedReason: reason, state: "confirming" });
  },

  confirmScan: async () => {
    const { currentStudent, selectedDirection, selectedReason } = get();
    if (!currentStudent) return;

    const isDuplicateScan = await isDuplicate(currentStudent.roll, selectedDirection);
    if (isDuplicateScan) {
      set({
        state: "error",
        error: {
          code: "DUPLICATE_SCAN",
          message: `This student was already scanned ${selectedDirection === "OUT" ? "out" : "in"} recently. Please wait 5 minutes.`,
        },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    const result = await addScan({
      roll: currentStudent.roll,
      direction: selectedDirection,
      reason: selectedDirection === "OUT" ? (selectedReason ?? "Regular") : undefined,
      gateId: get().gate?.id || "gate-1",
      operatorId: "op-1",
      isManual: false,
    });

    if (result.duplicate) {
      set({
        state: "error",
        error: { code: "DUPLICATE_SCAN", message: "This student was already scanned recently. Please wait 5 minutes." },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    // Update stats
    const stats = await statsToday();
    set({
      state: "success",
      lastScan: result.scan,
      todaysStats: stats,
      recentScans: stats.recentScans,
      currentStudent: null,
      selectedReason: null,
      photoVerificationDone: false,
    });

    setTimeout(() => get().reset(), 1000);
  },

  cancelScan: () => {
    set({
      state: "idle",
      currentStudent: null,
      selectedDirection: "IN",
      selectedReason: null,
      photoVerificationDone: false,
      error: null,
    });
  },

  reset: async () => {
    const stats = await statsToday();
    set({
      state: "idle",
      currentStudent: null,
      selectedDirection: "IN",
      selectedReason: null,
      photoVerificationDone: false,
      error: null,
      todaysStats: stats,
      recentScans: stats.recentScans,
    });
  },

  loadStats: async () => {
    const stats = await statsToday();
    set({ todaysStats: stats, recentScans: stats.recentScans });
  },

  setGate: async (gateId) => {
    const gate = await findGateById(gateId);
    set({ gate: gate ?? null });
  },

  flushOfflineQueue: () => {
    const { offlineQueue } = get();
    if (offlineQueue.length === 0) return;
    const scans = offlineQueue.map((s) => ({
      id: s.id,
      roll: s.roll,
      direction: s.direction,
      reason: s.reason,
      gateId: get().gate?.id || "gate-1",
      operatorId: "op-1",
    }));
    set({ offlineQueue: [] });
  },

  setOnline: (online) => set({ isOnline: online }),
}));
````

## File: gate-monitor/src/stores/uiStore.ts
````typescript
/**
 * Zustand UI store — global toast notifications, modal state, theme.
 */
import { create } from "zustand";
import type { ToastData, ToastVariant } from "@/components/ui/toast";

interface UIState {
  toasts: ToastData[];
  theme: "dark" | "light";
  isMobileSidebarOpen: boolean;
}

interface UIActions {
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleMobileSidebar: () => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  toasts: [],
  theme: "dark",
  isMobileSidebarOpen: false,

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const duration = toast.duration ?? 4000;
    const newToast: ToastData = { ...toast, id, duration };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    if (duration > 0) {
      setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
    }
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearAllToasts: () => set({ toasts: [] }),

  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

  success: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `s-${Date.now()}`, message, title, variant: "success" }],
  })),

  error: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `e-${Date.now()}`, message, title, variant: "error" }],
  })),

  info: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `i-${Date.now()}`, message, title, variant: "info" }],
  })),

  warning: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `w-${Date.now()}`, message, title, variant: "warning" }],
  })),
}));
````

## File: gate-monitor/.gitignore
````
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
````

## File: gate-monitor/AGENTS.md
````markdown
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
````

## File: gate-monitor/CLAUDE.md
````markdown
@AGENTS.md
````

## File: gate-monitor/eslint.config.mjs
````javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
````

## File: gate-monitor/fix_types.py
````python
#!/usr/bin/env python3
"""Update types.ts: align ExitReason configs and student type rules with SEMANTICS doc."""

import re

path = "src/lib/types.ts"
content = open(path).read()

# 1. Replace EXIT_REASON_CONFIGS (short codes -> long strings, reduce to 4)
old_configs = '''export const EXIT_REASON_CONFIGS: ExitReasonConfig[] = [
  { code: "REG", name: "Regular", description: "Regular exit/entry", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "silent" },
  { code: "HO", name: "Home Out", description: "Going home for overnight/weekend", applicableTo: ["HM", "HF"], maxDurationHours: 48, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "DO", name: "Day Out", description: "Full day outing", applicableTo: ["HM", "HF"], maxDurationHours: 8, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "SO", name: "Short Outing", description: "1-3 hours near college", applicableTo: ["HM", "HF"], maxDurationHours: 3, requiresApproval: false, parentNotification: "push", autoApproveTimeRange: "09:00-18:00" },
  { code: "EVT", name: "College Event", description: "Official college event", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: true, approvalBy: "faculty", parentNotification: "push" },
  { code: "MED", name: "Medical Emergency", description: "Medical emergency", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "urgent" },
  { code: "BUS", name: "Bus Departure", description: "Leaving by college bus", applicableTo: ["DM", "DF"], requiresApproval: false, parentNotification: "silent" },
];'''

new_configs = '''export const EXIT_REASON_CONFIGS: ExitReasonConfig[] = [
  { code: "Regular", name: "Regular", description: "Regular exit/entry", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "silent" },
  { code: "Home Out", name: "Home Out", description: "Going home for overnight/weekend", applicableTo: ["HM", "HF"], maxDurationHours: 48, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Day Out", name: "Day Out", description: "Full day outing", applicableTo: ["HM", "HF"], maxDurationHours: 8, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Leave", name: "Leave", description: "Leave application (covers medical, events, and other special cases)", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: true, approvalBy: "faculty", parentNotification: "push" },
];'''

if old_configs in content:
    content = content.replace(old_configs, new_configs)
    print("EXIT_REASON_CONFIGS: updated")
else:
    print("EXIT_REASON_CONFIGS: NOT FOUND (may already be updated)")

# 2. Replace STUDENT_TYPE_RULES allowedExitReasons
content = re.sub(
    r'allowedExitReasons: \["REG", "HO", "DO", "SO", "EVT", "MED"\]',
    'allowedExitReasons: ["Regular", "Home Out", "Day Out", "Leave"]',
    content
)
content = re.sub(
    r'allowedExitReasons: \["REG", "EVT", "MED", "BUS"\]',
    'allowedExitReasons: ["Regular", "Leave"]',
    content
)
print("STUDENT_TYPE_RULES: updated")

open(path, "w").write(content)
print("Done — types.ts written successfully")
````

## File: gate-monitor/next.config.ts
````typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to handle native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // On server side, we can use native modules
      config.resolve.alias = {
        ...config.resolve.alias,
        better_sqlite3: false,
      };
    }
    // On client side, API routes will handle DB operations
    return config;
  },
  turbopack: {},
};

export default nextConfig;
````

## File: gate-monitor/package.json
````json
{
  "name": "gate-monitor",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.112.3",
    "@types/bcryptjs": "^2.4.6",
    "bcryptjs": "^3.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.4.0",
    "framer-motion": "^13.1.0",
    "jose": "^6.2.9",
    "lucide-react": "^1.31.0",
    "next": "16.3.1",
    "qrcode": "^1.5.4",
    "qrcode.react": "^4.2.0",
    "react": "19.2.8",
    "react-day-picker": "^10.0.1",
    "react-dom": "19.2.8",
    "react-qrcode-logo": "^4.1.0",
    "recharts": "^3.10.1",
    "tailwind-merge": "^3.6.0",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
````

## File: gate-monitor/postcss.config.mjs
````javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
````

## File: gate-monitor/README.md
````markdown
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
````

## File: gate-monitor/tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
````

## File: Plan/Gate_Monitoring_BACKEND_Architecture.md
````markdown
# ═══════════════════════════════════════════════════════════════════════════════
# GATE MONITORING SYSTEM — COMPLETE BACKEND ARCHITECTURE
# JNTUH University College of Engineering, Nachupally (Kondagattu)
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — SYSTEM OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 What This Backend Powers
- Gate Operator Tablet App (QR Scan → Record IN/OUT)
- Gate Supervisor Dashboard (Logs, Corrections, Passes)
- Admin Command Center (Real-time monitoring, analytics, alerts)
- Parent Mobile App (Notifications, child status, gate pass approvals)
- Student Mobile App (Digital ID, gate pass requests, history)

## 1.2 Architecture Style
- RESTful API (primary)
- WebSockets (real-time updates)
- Event-driven notifications (async queue)
- Microservices-ready monolith (can split later)

## 1.3 Tech Stack
- Runtime: Node.js 20+ LTS
- Framework: Express.js OR Next.js API Routes
- Database: PostgreSQL 15+ (primary), Redis 7+ (cache + sessions + real-time)
- ORM: Prisma OR Drizzle
- Real-time: Socket.io (WebSockets)
- Queue: BullMQ (Redis-based job queue)
- Auth: JWT (access + refresh tokens) + bcrypt
- Notifications: Firebase Cloud Messaging (push) + Twilio (SMS) + Nodemailer (email)
- QR Generation: qrcode (npm)
- QR Scanning: react-zxing / html5-qrcode (frontend)
- Logging: Winston + structured JSON logs
- Monitoring: Prometheus metrics endpoint


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — DATABASE SCHEMA (PostgreSQL)
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Entity Relationship Diagram (Conceptual)

    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
    │  DEPARTMENT │◄──────│   STUDENT   │       │   FACULTY   │
    └─────────────┘       └──────┬──────┘       └─────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │GATE_PASS │  │GATE_LOG  │  │  AUDIT   │
            │ REQUEST  │  │          │  │   LOG    │
            └──────────┘  └────┬─────┘  └──────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │  GATE    │ │  USER    │ │NOTIFICATION│
            │          │ │          │ │  QUEUE    │
            └──────────┘ └──────────┘ └──────────┘


## 2.2 Table Definitions

### Table: departments
```sql
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(10) UNIQUE NOT NULL,   -- CSE, IT, ECE, EEE, ME
    name            VARCHAR(100) NOT NULL,          -- Computer Science & Engineering
    hod_faculty_id  UUID REFERENCES faculty(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: students
```sql
CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number     VARCHAR(20) UNIQUE NOT NULL,    -- 21CSE045
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE,
    phone           VARCHAR(15),
    parent_name     VARCHAR(100),
    parent_phone    VARCHAR(15) NOT NULL,           -- For SMS notifications
    parent_email    VARCHAR(100),                   -- For email notifications
    department_id   UUID NOT NULL REFERENCES departments(id),
    year            INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    section         VARCHAR(5) NOT NULL,            -- A, B, C
    batch           VARCHAR(10) NOT NULL,           -- 2021-2025
    photo_url       TEXT,                           -- Student photo for verification
    qr_uuid         UUID UNIQUE DEFAULT gen_random_uuid(), -- Unique QR identifier
    id_card_valid_until DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_roll ON students(roll_number);
CREATE INDEX idx_students_qr ON students(qr_uuid);
CREATE INDEX idx_students_dept ON students(department_id);
CREATE INDEX idx_students_parent_phone ON students(parent_phone);
```

### Table: gates
```sql
CREATE TABLE gates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,           -- Main Gate, Hostel Gate, Back Gate
    location        VARCHAR(100),                   -- Description
    type            VARCHAR(20) NOT NULL CHECK (type IN ('entry_exit', 'entry_only', 'exit_only')),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: users (Gate Operators, Supervisors, Admins, System Admins)
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     VARCHAR(20) UNIQUE,             -- For staff
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE,
    phone           VARCHAR(15),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(30) NOT NULL CHECK (role IN ('gate_operator', 'gate_supervisor', 'admin', 'system_admin')),
    assigned_gate_id UUID REFERENCES gates(id),     -- NULL for admin/sysadmin
    shift_start     TIME,                           -- For operators
    shift_end       TIME,
    pin_hash        VARCHAR(255),                   -- 4-digit PIN for quick tablet login
    last_login      TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_gate ON users(assigned_gate_id);
CREATE INDEX idx_users_employee ON users(employee_id);
```

### Table: gate_logs (CORE TABLE — Every scan record)
```sql
CREATE TABLE gate_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id),
    gate_id         UUID NOT NULL REFERENCES gates(id),
    operator_id     UUID NOT NULL REFERENCES users(id),
    device_id       VARCHAR(100),                   -- Tablet device identifier
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    reason          VARCHAR(20) CHECK (reason IN ('regular', 'home_out', 'day_out', 'leave', 'event', 'visitor')),
    scan_method     VARCHAR(20) DEFAULT 'qr' CHECK (scan_method IN ('qr', 'manual', 'biometric', 'gate_pass')),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    geo_location    POINT,                          -- PostGIS point (lat, lng)
    is_validated    BOOLEAN DEFAULT true,
    validation_notes TEXT,                          -- If manual entry or correction
    parent_notified BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Critical indexes for performance
CREATE INDEX idx_gate_logs_student ON gate_logs(student_id);
CREATE INDEX idx_gate_logs_timestamp ON gate_logs(timestamp);
CREATE INDEX idx_gate_logs_gate ON gate_logs(gate_id);
CREATE INDEX idx_gate_logs_direction ON gate_logs(direction);
CREATE INDEX idx_gate_logs_date ON gate_logs(DATE(timestamp));
CREATE INDEX idx_gate_logs_student_timestamp ON gate_logs(student_id, timestamp DESC);
CREATE INDEX idx_gate_logs_today ON gate_logs(gate_id, DATE(timestamp)) WHERE DATE(timestamp) = CURRENT_DATE;
```

### Table: gate_pass_requests
```sql
CREATE TABLE gate_pass_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id),
    request_type    VARCHAR(20) NOT NULL CHECK (request_type IN ('home_out', 'day_out', 'leave', 'event')),
    from_datetime   TIMESTAMPTZ NOT NULL,
    to_datetime     TIMESTAMPTZ NOT NULL,
    reason          TEXT NOT NULL,
    parent_approved BOOLEAN DEFAULT NULL,           -- NULL=pending, true=approved, false=rejected
    parent_approved_at TIMESTAMPTZ,
    admin_approved  BOOLEAN DEFAULT NULL,
    admin_approved_at TIMESTAMPTZ,
    approved_by     UUID REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'parent_approved', 'admin_approved', 'rejected', 'expired', 'used')),
    digital_pass_qr UUID UNIQUE DEFAULT gen_random_uuid(),
    used_at         TIMESTAMPTZ,
    used_gate_id    UUID REFERENCES gates(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_dates CHECK (to_datetime > from_datetime)
);

CREATE INDEX idx_gate_pass_student ON gate_pass_requests(student_id);
CREATE INDEX idx_gate_pass_status ON gate_pass_requests(status);
CREATE INDEX idx_gate_pass_dates ON gate_pass_requests(from_datetime, to_datetime);
```

### Table: campus_occupancy (Real-time counter — updated via trigger)
```sql
CREATE TABLE campus_occupancy (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id),
    current_status  VARCHAR(10) NOT NULL CHECK (current_status IN ('IN', 'OUT')),
    last_gate_id    UUID REFERENCES gates(id),
    last_log_id     UUID REFERENCES gate_logs(id),
    last_updated    TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id)
);

CREATE INDEX idx_occupancy_status ON campus_occupancy(current_status);
CREATE INDEX idx_occupancy_student ON campus_occupancy(student_id);
```

### Table: notifications
```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type  VARCHAR(20) NOT NULL CHECK (recipient_type IN ('parent', 'student', 'admin', 'supervisor', 'operator')),
    recipient_id    UUID NOT NULL,                  -- Could be student.parent_id or user.id
    recipient_phone VARCHAR(15),
    recipient_email VARCHAR(100),
    type            VARCHAR(30) NOT NULL,           -- 'gate_exit', 'gate_entry', 'overdue', 'gate_pass_request', etc.
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    data            JSONB,                          -- Extra payload
    channel         VARCHAR(20)[] DEFAULT ARRAY['push'], -- push, sms, email
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### Table: audit_logs
```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      VARCHAR(50) NOT NULL,
    record_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'OVERRIDE')),
    old_values      JSONB,
    new_values      JSONB,
    changed_by      UUID NOT NULL REFERENCES users(id),
    changed_by_role VARCHAR(30) NOT NULL,
    reason          TEXT,                           -- Required for corrections/overrides
    ip_address      INET,
    user_agent      TEXT,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_record ON audit_logs(record_id);
CREATE INDEX idx_audit_user ON audit_logs(changed_by);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

### Table: sessions
```sql
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    token           VARCHAR(255) UNIQUE NOT NULL,
    refresh_token   VARCHAR(255) UNIQUE,
    device_info     JSONB,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    last_active     TIMESTAMPTZ DEFAULT NOW(),
    is_valid        BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_valid ON sessions(is_valid) WHERE is_valid = true;
```

### Table: device_registry
```sql
CREATE TABLE device_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       VARCHAR(100) UNIQUE NOT NULL,
    device_name     VARCHAR(100),
    device_type     VARCHAR(20) CHECK (device_type IN ('tablet', 'mobile', 'desktop', 'kiosk')),
    assigned_gate_id UUID REFERENCES gates(id),
    assigned_to     UUID REFERENCES users(id),
    last_seen       TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```


## 2.3 Database Triggers

### Trigger: Auto-update campus_occupancy on gate_log insert
```sql
CREATE OR REPLACE FUNCTION update_campus_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO campus_occupancy (student_id, current_status, last_gate_id, last_log_id, last_updated)
    VALUES (NEW.student_id, NEW.direction, NEW.gate_id, NEW.id, NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET
        current_status = NEW.direction,
        last_gate_id = NEW.gate_id,
        last_log_id = NEW.id,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_occupancy
AFTER INSERT ON gate_logs
FOR EACH ROW
EXECUTE FUNCTION update_campus_occupancy();
```

### Trigger: Auto-update student status on gate_log (for notifications)
```sql
CREATE OR REPLACE FUNCTION check_overdue_returns()
RETURNS TRIGGER AS $$
BEGIN
    -- If student is going OUT with home_out/day_out/leave, schedule overdue check
    IF NEW.direction = 'OUT' AND NEW.reason IN ('home_out', 'day_out', 'leave') THEN
        -- This will be handled by the application layer (BullMQ job)
        -- But we can set a flag here
        PERFORM pg_notify('gate_exit', json_build_object(
            'student_id', NEW.student_id,
            'gate_log_id', NEW.id,
            'reason', NEW.reason,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_overdue
AFTER INSERT ON gate_logs
FOR EACH ROW
EXECUTE FUNCTION check_overdue_returns();
```


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — API ENDPOINTS (RESTful)
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 Base URL & Versioning
```
https://api.jntuhcej-campus.in/v1
```

## 3.2 Authentication Endpoints

### POST /auth/login
**Description:** Login for all roles (Operator, Supervisor, Admin, System Admin)
**Body:**
```json
{
  "employee_id": "SEC001",
  "password": "hashed_password",
  "device_id": "tablet-gate1-001"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "name": "Ramesh Kumar",
      "role": "gate_operator",
      "assigned_gate": {
        "id": "uuid",
        "name": "Main Gate"
      },
      "shift": {
        "start": "06:00",
        "end": "14:00"
      }
    }
  }
}
```

### POST /auth/refresh
**Description:** Refresh access token
**Body:** `{ "refresh_token": "..." }`

### POST /auth/logout
**Description:** Invalidate session
**Headers:** `Authorization: Bearer <token>`

### POST /auth/pin-login
**Description:** Quick PIN login for Gate Operators on tablets
**Body:**
```json
{
  "employee_id": "SEC001",
  "pin": "1234",
  "device_id": "tablet-gate1-001"
}
```

## 3.3 Gate Operator Endpoints

### GET /gate/operator/dashboard
**Description:** Get operator's dashboard data (last scan, today's stats, recent scans)
**Auth:** Gate Operator + Gate Supervisor
**Response:**
```json
{
  "success": true,
  "data": {
    "operator": { "id": "...", "name": "...", "gate": "Main Gate" },
    "last_scan": {
      "student": { "id": "...", "name": "K. Rahul", "roll_number": "21CSE045", "photo_url": "...", "department": "CSE", "year": 3 },
      "direction": "IN",
      "timestamp": "2026-08-15T09:12:43+05:30",
      "reason": "regular"
    },
    "today_stats": {
      "entries": 1247,
      "exits": 312,
      "on_campus": 935
    },
    "recent_scans": [
      { "student_name": "...", "roll_number": "...", "direction": "OUT", "reason": "home_out", "time": "09:12:43" }
    ]
  }
}
```

### POST /gate/scan
**Description:** Record a gate scan (QR or Manual)
**Auth:** Gate Operator
**Body:**
```json
{
  "qr_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "direction": "OUT",
  "reason": "home_out",
  "scan_method": "qr",
  "device_id": "tablet-gate1-001",
  "geo_location": { "lat": 18.5204, "lng": 78.0075 }
}
```
**Validation Rules:**
1. QR must exist in students table
2. Student status must be 'active'
3. ID card must not be expired
4. Duplicate prevention: Same student cannot scan same direction within 5 minutes
5. Direction logic: If last record is IN, default next is OUT (can override)
6. If direction is OUT, reason is REQUIRED

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "log_id": "uuid",
    "student": {
      "id": "...",
      "name": "K. Rahul",
      "roll_number": "21CSE045",
      "photo_url": "...",
      "department": "CSE",
      "year": 3,
      "section": "A"
    },
    "direction": "OUT",
    "reason": "home_out",
    "timestamp": "2026-08-15T09:12:43+05:30",
    "message": "Exit recorded successfully. Parent notification queued."
  }
}
```

**Response (Error — Duplicate):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SCAN",
    "message": "This student was already scanned OUT 2 minutes ago. Please wait 5 minutes."
  }
}
```

**Response (Error — Invalid QR):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QR",
    "message": "Invalid QR code. Please contact administration."
  }
}
```

**Response (Error — Expired ID):**
```json
{
  "success": false,
  "error": {
    "code": "EXPIRED_ID",
    "message": "Student ID card has expired. Please renew at the administration office."
  }
}
```

### POST /gate/scan/manual
**Description:** Manual entry when QR is damaged or forgotten
**Auth:** Gate Operator (requires supervisor PIN confirmation)
**Body:**
```json
{
  "roll_number": "21CSE045",
  "direction": "IN",
  "reason": "regular",
  "supervisor_pin": "5678",
  "device_id": "tablet-gate1-001"
}
```
**Rules:**
- Supervisor PIN must be verified
- Scan method automatically set to 'manual'
- Audit log entry created with reason "Manual entry — damaged QR"

### GET /gate/student/:roll_number
**Description:** Search student by roll number (for manual entry)
**Auth:** Gate Operator
**Response:** Student basic info + photo + last scan status

## 3.4 Gate Supervisor Endpoints

### GET /gate/supervisor/logs
**Description:** Get gate logs with filters
**Auth:** Gate Supervisor (own gate only) / Admin (all gates)
**Query Params:**
```
?gate_id=uuid&date=2026-08-15&direction=OUT&reason=home_out&search=21CSE&page=1&limit=50
```
**Response:** Paginated list of gate logs with student details

### PUT /gate/supervisor/logs/:log_id
**Description:** Correct a gate log (only within 1 hour of creation)
**Auth:** Gate Supervisor
**Body:**
```json
{
  "direction": "IN",
  "reason": "regular",
  "correction_reason": "Operator mistakenly marked OUT instead of IN"
}
```
**Rules:**
- Can only edit logs created within last 1 hour
- Must provide correction_reason
- Old values preserved in audit_log
- Notification sent if student was marked wrong

### GET /gate/supervisor/passes
**Description:** Get pending gate pass requests for this gate
**Auth:** Gate Supervisor
**Response:** List of gate pass requests with student details

### PUT /gate/supervisor/passes/:pass_id
**Description:** Approve or reject gate pass
**Auth:** Gate Supervisor / Admin
**Body:**
```json
{
  "action": "approve",
  "comments": "Approved for family function"
}
```

## 3.5 Admin Endpoints

### GET /admin/dashboard
**Description:** Get admin dashboard KPIs and real-time data
**Auth:** Admin / System Admin
**Response:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "on_campus": 1247,
      "today_entries": 1559,
      "today_exits": 312,
      "active_alerts": 3
    },
    "department_breakdown": [
      { "department": "CSE", "in": 312, "out": 45, "percentage": 87 },
      { "department": "ECE", "in": 278, "out": 38, "percentage": 88 }
    ],
    "recent_activity": [
      { "timestamp": "...", "student_name": "...", "roll": "...", "direction": "OUT", "reason": "home_out", "gate": "Main Gate" }
    ],
    "alerts": [
      { "type": "overdue", "severity": "critical", "message": "Student 21CSE045 has not returned from Home Out" }
    ]
  }
}
```

### GET /admin/analytics/occupancy
**Description:** Get campus occupancy over time
**Auth:** Admin
**Query:** `?from=2026-08-15&to=2026-08-15&interval=hourly`
**Response:** Time-series data for charting

### GET /admin/analytics/department/:dept_id
**Description:** Department-level gate analytics
**Auth:** Admin

### GET /admin/students/search
**Description:** Search students across all data
**Auth:** Admin
**Query:** `?q=rahul&department=CSE&year=3&status=active`

### GET /admin/alerts
**Description:** Get all alerts with filtering
**Auth:** Admin
**Query:** `?severity=critical&status=active&page=1`

### PUT /admin/alerts/:alert_id
**Description:** Resolve, escalate, or snooze an alert
**Auth:** Admin

### GET /admin/reports/generate
**Description:** Generate reports
**Auth:** Admin
**Query:**
```
?type=daily_summary&date=2026-08-15&format=pdf
?type=student_movement&student_id=uuid&from=...&to=...&format=excel
?type=gate_activity&gate_id=uuid&from=...&to=...&format=pdf
```

### POST /admin/reports/schedule
**Description:** Schedule recurring reports
**Auth:** Admin
**Body:**
```json
{
  "report_type": "daily_summary",
  "frequency": "daily",
  "time": "18:00",
  "recipients": ["principal@jntuhcej.ac.in"],
  "format": "pdf"
}
```

## 3.6 Gate Pass Endpoints

### POST /gate-passes
**Description:** Student requests a gate pass
**Auth:** Student (via mobile app)
**Body:**
```json
{
  "request_type": "day_out",
  "from_datetime": "2026-08-15T14:00:00+05:30",
  "to_datetime": "2026-08-15T18:00:00+05:30",
  "reason": "Need to visit hospital for checkup"
}
```
**Rules:**
- from_datetime must be in future
- to_datetime must be after from_datetime
- Max duration: Home Out = 48h, Day Out = 12h, Leave = 30 days

### GET /gate-passes/my
**Description:** Student views their gate pass requests
**Auth:** Student

### GET /gate-passes/parent
**Description:** Parent views child's gate pass requests
**Auth:** Parent (via parent app token)

### PUT /gate-passes/:pass_id/parent-approve
**Description:** Parent approves/rejects gate pass
**Auth:** Parent
**Body:** `{ "approved": true, "comments": "Be back by 6 PM" }`

### PUT /gate-passes/:pass_id/admin-approve
**Description:** Admin approves/rejects gate pass
**Auth:** Admin

### POST /gate-passes/:pass_id/scan
**Description:** Scan gate pass QR at gate
**Auth:** Gate Operator
**Body:** `{ "digital_pass_qr": "uuid", "gate_id": "uuid" }`
**Rules:**
- Pass must be approved by both parent AND admin
- Current time must be within from_datetime and to_datetime
- Pass status changes to 'used'
- Auto-logs gate exit with reason from pass

## 3.7 Student / Parent Endpoints

### GET /students/:student_id/gate-history
**Description:** Get student's gate history
**Auth:** Student (own data) / Parent (child's data) / Admin
**Query:** `?from=2026-08-01&to=2026-08-15&page=1`

### GET /students/:student_id/status
**Description:** Get current campus status
**Auth:** Student / Parent / Admin
**Response:**
```json
{
  "current_status": "OUT",
  "last_scan": { "direction": "OUT", "timestamp": "...", "reason": "home_out", "gate": "Main Gate" },
  "expected_return": "2026-08-16T08:00:00+05:30"
}
```

### GET /parents/:parent_id/children
**Description:** Get all children for a parent
**Auth:** Parent

## 3.8 System Admin Endpoints

### GET /system/devices
**Description:** List all registered devices
**Auth:** System Admin

### POST /system/devices
**Description:** Register a new device
**Auth:** System Admin

### GET /system/audit-logs
**Description:** View all audit logs with filters
**Auth:** System Admin / Admin
**Query:** `?table=gate_logs&user_id=uuid&from=...&to=...&action=UPDATE`

### GET /system/health
**Description:** System health check
**Auth:** System Admin
**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "last_backup": "2026-08-15T02:00:00+05:30",
  "active_sessions": 45,
  "gate_statuses": [
    { "gate": "Main Gate", "status": "online", "last_ping": "..." },
    { "gate": "Hostel Gate", "status": "offline", "last_ping": "..." }
  ]
}
```


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — BUSINESS LOGIC & VALIDATION RULES
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 QR Scan Validation Pipeline

```
1. RECEIVE scan request (QR UUID + direction + reason + device_id)
   │
   ▼
2. AUTHENTICATE operator (valid token? valid role? assigned to this gate?)
   │
   ▼
3. VALIDATE QR (exists in students table?)
   │  ├─ NO → Return INVALID_QR error
   │  └─ YES → Continue
   │
   ▼
4. CHECK student status (active? not suspended? not graduated?)
   │  ├─ NO → Return INACTIVE_STUDENT error
   │  └─ YES → Continue
   │
   ▼
5. CHECK ID card validity (not expired?)
   │  ├─ NO → Return EXPIRED_ID error
   │  └─ YES → Continue
   │
   ▼
6. CHECK duplicate scan (same student, same direction within 5 min?)
   │  ├─ YES → Return DUPLICATE_SCAN error
   │  └─ NO → Continue
   │
   ▼
7. CHECK direction logic (if last was IN and this is IN → warn?)
   │  ├─ If same direction as last → Require operator confirmation
   │  └─ If different → Auto-accept
   │
   ▼
8. CHECK gate pass (if OUT, does student have approved gate pass?)
   │  ├─ If reason is home_out/day_out/leave → Check for valid pass
   │  ├─ If pass exists and valid → Auto-approve
   │  ├─ If pass exists but not valid → Warn operator
   │  └─ If no pass → Allow (regular exit)
   │
   ▼
9. CREATE gate_log record
   │
   ▼
10. UPDATE campus_occupancy (via trigger)
    │
    ▼
11. QUEUE notifications (if OUT → parent notification job)
    │
    ▼
12. EMIT real-time event (WebSocket → admin dashboard)
    │
    ▼
13. RETURN success response with student details
```

## 4.2 Duplicate Scan Prevention
```javascript
const COOLDOWN_MINUTES = 5;

async function checkDuplicateScan(studentId, direction) {
  const lastScan = await db.gate_logs.findFirst({
    where: { student_id: studentId },
    orderBy: { timestamp: 'desc' }
  });

  if (!lastScan) return { valid: true };

  const minutesSinceLastScan = differenceInMinutes(
    new Date(), 
    lastScan.timestamp
  );

  if (lastScan.direction === direction && minutesSinceLastScan < COOLDOWN_MINUTES) {
    return {
      valid: false,
      error: 'DUPLICATE_SCAN',
      message: `Already scanned ${direction} ${minutesSinceLastScan} minutes ago. Wait ${COOLDOWN_MINUTES - minutesSinceLastScan} more minutes.`,
      lastScan
    };
  }

  return { valid: true };
}
```

## 4.3 Direction Auto-Detection
```javascript
async function getSuggestedDirection(studentId) {
  const lastScan = await db.gate_logs.findFirst({
    where: { student_id: studentId },
    orderBy: { timestamp: 'desc' }
  });

  if (!lastScan) return 'IN'; // First ever scan defaults to IN

  // Toggle direction
  return lastScan.direction === 'IN' ? 'OUT' : 'IN';
}
```

## 4.4 Photo Verification (Anti-Proxy)
```javascript
// After QR scan, display student photo for 2 seconds
// Operator must visually verify before confirming
// This prevents one student scanning another's QR

const VERIFICATION_DELAY_MS = 2000;

// Frontend: Show photo overlay with countdown
// Backend: Accept confirmation only if verification_delay has passed
```

## 4.5 Overdue Detection
```javascript
// Scheduled job (every 15 minutes)
async function checkOverdueStudents() {
  const overdueStudents = await db.gate_logs.findMany({
    where: {
      direction: 'OUT',
      reason: { in: ['home_out', 'day_out'] },
      timestamp: { 
        lt: subHours(new Date(), OVERDUE_HOURS[reason]) 
      },
      // Student is still OUT
      student: {
        campus_occupancy: { current_status: 'OUT' }
      }
    },
    include: { student: true }
  });

  for (const record of overdueStudents) {
    await createAlert({
      type: 'overdue_return',
      severity: 'critical',
      student_id: record.student_id,
      message: `Student ${record.student.name} (${record.student.roll_number}) has not returned from ${record.reason}. Expected by ${expectedReturnTime}.`,
      notify: ['parent', 'admin', 'supervisor']
    });
  }
}
```

## 4.6 Gate Pass Validation
```javascript
async function validateGatePass(studentId, reason, currentTime) {
  if (reason === 'regular') return { valid: true }; // No pass needed

  const pass = await db.gate_pass_requests.findFirst({
    where: {
      student_id: studentId,
      status: 'admin_approved',
      from_datetime: { lte: currentTime },
      to_datetime: { gte: currentTime }
    }
  });

  if (!pass) {
    return {
      valid: false,
      warning: 'No approved gate pass found. Proceed with caution.',
      requires_supervisor_confirmation: true
    };
  }

  return { valid: true, pass_id: pass.id };
}
```


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — REAL-TIME ARCHITECTURE (WebSockets)
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 Socket.io Room Structure
```
global_room              → All connected clients
admin_room               → Admin + System Admin dashboards
gate_:gate_id            → Gate-specific (operators + supervisors at that gate)
supervisor_room          → All supervisors
parent_:parent_id        → Individual parent app sessions
student_:student_id      → Individual student app sessions
```

## 5.2 Events

### Server → Client (Broadcast)
| Event | Payload | Recipients |
|-------|---------|------------|
| `gate:scan` | `{ student, direction, reason, gate, timestamp }` | admin_room, gate_:gate_id |
| `gate:occupancy_update` | `{ on_campus, entries_today, exits_today }` | admin_room, gate_:gate_id |
| `gate:alert` | `{ type, severity, message, student }` | admin_room, supervisor_room |
| `gate:scanner_offline` | `{ gate_id, gate_name, offline_since }` | admin_room, supervisor_room |
| `parent:notification` | `{ title, message, student, type }` | parent_:parent_id |
| `student:status_change` | `{ status, last_scan }` | student_:student_id |

### Client → Server
| Event | Payload | Handler |
|-------|---------|---------|
| `join_gate` | `{ gate_id, token }` | Authenticate and join gate room |
| `join_admin` | `{ token }` | Authenticate and join admin room |
| `join_parent` | `{ parent_id, token }` | Authenticate and join parent room |
| `heartbeat` | `{ device_id, gate_id }` | Update device last_seen |

## 5.3 WebSocket Authentication
```javascript
// Middleware: Verify JWT before allowing socket connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.users.findUnique({ where: { id: decoded.user_id } });
    if (!user || user.status !== 'active') throw new Error('Unauthorized');
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

## 5.4 Heartbeat & Offline Detection
```javascript
// Every 30 seconds, gate operator app sends heartbeat
// If no heartbeat for 5 minutes → Mark scanner as offline
// Emit alert to admin and supervisor rooms

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_THRESHOLD = 300000; // 5 minutes

setInterval(async () => {
  const offlineDevices = await db.device_registry.findMany({
    where: {
      last_seen: { lt: new Date(Date.now() - OFFLINE_THRESHOLD) },
      status: 'active'
    }
  });

  for (const device of offlineDevices) {
    await db.device_registry.update({
      where: { id: device.id },
      data: { status: 'offline' }
    });

    io.to('admin_room').emit('gate:scanner_offline', {
      gate_id: device.assigned_gate_id,
      device_id: device.device_id,
      offline_since: device.last_seen
    });
  }
}, OFFLINE_THRESHOLD);
```


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — NOTIFICATION SYSTEM (Async Queue)
# ═══════════════════════════════════════════════════════════════════════════════

## 6.1 Queue Architecture (BullMQ + Redis)
```
Gate Scan Event
      │
      ▼
[Notification Queue]
      │
      ├──► Push Notification Worker ──► Firebase FCM
      │
      ├──► SMS Worker ──► Twilio API
      │
      └──► Email Worker ──► Nodemailer / SendGrid
```

## 6.2 Notification Types & Templates

### Type: gate_exit_home_out
**Trigger:** Student scans OUT with reason = 'home_out'
**Recipients:** Parent (primary), Student (secondary)
**Channels:** Push + SMS
**Template:**
```
Title: Your ward has left campus
Message: K. Rahul (21CSE045) has LEFT the campus at 4:30 PM. 
         Reason: Home Out. Expected return: Tomorrow 8:00 AM.
         Gate: Main Gate.
```

### Type: gate_exit_day_out
**Trigger:** Student scans OUT with reason = 'day_out'
**Recipients:** Parent
**Channels:** Push + SMS
**Template:**
```
Title: Day Out — K. Rahul
Message: Your ward K. Rahul (21CSE045) has left for Day Out at 10:00 AM.
         Expected return: 6:00 PM. Gate: Main Gate.
```

### Type: gate_entry
**Trigger:** Student scans IN
**Recipients:** Parent (silent push only)
**Channels:** Push
**Template:**
```
Title: K. Rahul has entered campus
Message: Your ward has entered the campus at 8:15 AM. Gate: Main Gate.
```

### Type: overdue_return
**Trigger:** Scheduled job detects student not returned on time
**Recipients:** Parent + Admin + Supervisor
**Channels:** Push + SMS
**Template:**
```
Title: ⚠️ Overdue Return Alert
Message: K. Rahul (21CSE045) has NOT returned from Home Out.
         Expected by: Tomorrow 8:00 AM. Current time: 10:00 PM.
         Last seen: Main Gate at 4:30 PM.
```

### Type: gate_pass_request
**Trigger:** Student submits gate pass request
**Recipients:** Parent
**Channels:** Push + Email
**Template:**
```
Title: Gate Pass Request — Action Required
Message: K. Rahul has requested a Day Out on 15 Aug 2026 (10 AM - 6 PM).
         Reason: Hospital visit.
         [Approve] [Reject] [View Details]
```

### Type: gate_pass_approved
**Trigger:** Gate pass fully approved (parent + admin)
**Recipients:** Student
**Channels:** Push
**Template:**
```
Title: Gate Pass Approved
Message: Your Day Out request for 15 Aug 2026 has been approved.
         Show the digital pass QR at the gate.
```

### Type: scanner_offline
**Trigger:** Gate scanner no heartbeat for 5 minutes
**Recipients:** Admin + Supervisor
**Channels:** Push + Email
**Template:**
```
Title: 🚨 Gate Scanner Offline
Message: Main Gate scanner (Device: tablet-gate1-001) has been offline 
         since 9:45 AM. Please check immediately.
```

### Type: unusual_pattern
**Trigger:** ML/Rule engine detects anomaly
**Recipients:** Admin
**Channels:** Email
**Template:**
```
Title: Unusual Gate Activity Detected
Message: Student 21CSE045 has exited campus 5 times this week 
         (usual: 1 time). Please review.
```

## 6.3 Notification Delivery Status Tracking
```javascript
// Each notification record tracks:
// - status: pending → sent → read / failed
// - sent_at: when successfully delivered
// - read_at: when user opened it
// - error_message: if delivery failed

// Retry logic:
// - Push: Retry 3 times with exponential backoff
// - SMS: Retry 2 times
// - Email: Retry 3 times
// - After max retries → Mark as failed, alert admin
```

## 6.4 Rate Limiting
```javascript
// Prevent notification spam
// Max 5 SMS per parent per hour
// Max 10 push notifications per parent per hour
// Max 3 email per parent per day
```


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — OFFLINE MODE & SYNC
# ═══════════════════════════════════════════════════════════════════════════════

## 7.1 Gate Operator Offline Mode
**Scenario:** Tablet loses internet during shift.

### Local Storage (IndexedDB)
```javascript
// Store pending scans locally
const pendingScans = [
  {
    id: 'local-001',
    qr_uuid: '...',
    direction: 'OUT',
    reason: 'home_out',
    timestamp: '2026-08-15T10:30:00+05:30',
    device_id: 'tablet-gate1-001',
    synced: false
  }
];
```

### Sync Flow
```
1. Operator scans QR while offline
   │
   ▼
2. Store in IndexedDB with local ID
   │
   ▼
3. Show success to operator (optimistic UI)
   │
   ▼
4. When connection restored:
   │
   ├──► Send all pending scans to /gate/scan/bulk
   │
   ├──► Server validates each scan
   │
   ├──► Server returns results (success / error per scan)
   │
   └──► Client clears synced records, shows errors
```

### POST /gate/scan/bulk
**Body:**
```json
{
  "scans": [
    { "qr_uuid": "...", "direction": "OUT", "reason": "home_out", "timestamp": "...", "device_id": "..." }
  ]
}
```
**Response:**
```json
{
  "results": [
    { "local_id": "local-001", "status": "success", "log_id": "uuid" },
    { "local_id": "local-002", "status": "error", "error": "DUPLICATE_SCAN" }
  ]
}
```

## 7.2 Conflict Resolution
```javascript
// If a scan was recorded offline and later online:
// Priority: Server timestamp > Local timestamp
// If conflict detected → Log both, flag for supervisor review
```


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — AUDIT & COMPLIANCE
# ═══════════════════════════════════════════════════════════════════════════════

## 8.1 What Gets Audited
| Action | Table | Logged Fields |
|--------|-------|---------------|
| Gate scan created | gate_logs | All fields |
| Gate scan corrected | gate_logs | Old direction, new direction, reason |
| Gate pass approved/rejected | gate_pass_requests | Old status, new status, approver |
| Student status changed | students | Old status, new status |
| User role changed | users | Old role, new role |
| Device registered | device_registry | All fields |
| Login failed | sessions | IP, user_agent, reason |

## 8.2 Audit Log Retention
- Active logs: 1 year in primary database
- Archived logs: 7 years in cold storage (S3 / Glacier)
- Auto-archive job runs monthly

## 8.3 Compliance Requirements
- GDPR-style data access: Student/parent can request their data export
- Right to deletion: Graduated students can request data deletion (after 1 year)
- Data minimization: Only collect necessary data
- Encryption at rest: Database encryption enabled
- Encryption in transit: TLS 1.3 for all API calls


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9 — PERFORMANCE & SCALING
# ═══════════════════════════════════════════════════════════════════════════════

## 9.1 Database Optimization
- Partition gate_logs by month (automatic partitioning)
- Archive logs older than 1 year to separate table
- Use materialized views for daily/weekly aggregates
- Connection pooling (PgBouncer): Max 100 connections
- Read replicas for analytics queries

## 9.2 Caching Strategy (Redis)
| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `student:qr:{uuid}` | 1 hour | Student lookup by QR |
| `student:roll:{roll}` | 1 hour | Student lookup by roll |
| `occupancy:count` | 5 seconds | Real-time campus count |
| `occupancy:dept:{id}` | 5 seconds | Department counts |
| `gate:today:{gate_id}` | 1 minute | Today's scan counts |
| `session:{token}` | 15-30 min | Active sessions |
| `device:{device_id}` | 1 min | Device status |

## 9.3 API Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /gate/scan | 60 | 1 minute |
| GET /gate/operator/dashboard | 30 | 1 minute |
| GET /admin/dashboard | 10 | 1 minute |
| POST /auth/login | 5 | 1 minute |
| All other | 100 | 1 minute |

## 9.4 Scaling Plan
- Phase 1 (Prototype): Single server, single DB
- Phase 2 (Pilot): Load balancer, 2 app servers, 1 DB + read replica
- Phase 3 (Production): Kubernetes cluster, auto-scaling, DB sharding by department


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 10 — ERROR HANDLING & STATUS CODES
# ═══════════════════════════════════════════════════════════════════════════════

## 10.1 Standard Response Format
```json
{
  "success": true/false,
  "data": { ... },           // Present if success=true
  "error": {                 // Present if success=false
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }        // Optional extra context
  },
  "meta": {
    "timestamp": "2026-08-15T09:12:43+05:30",
    "request_id": "uuid"
  }
}
```

## 10.2 Error Codes
| Code | HTTP | Meaning |
|------|------|---------|
| INVALID_QR | 400 | QR code not found in database |
| EXPIRED_ID | 400 | Student ID card has expired |
| INACTIVE_STUDENT | 400 | Student status is not active |
| DUPLICATE_SCAN | 429 | Same student scanned same direction within cooldown |
| INVALID_DIRECTION | 400 | Direction must be IN or OUT |
| MISSING_REASON | 400 | Reason required for OUT scans |
| UNAUTHORIZED_GATE | 403 | Operator not assigned to this gate |
| SUPERVISOR_PIN_INVALID | 403 | PIN verification failed for manual entry |
| GATE_PASS_INVALID | 400 | Gate pass not found or expired |
| GATE_PASS_NOT_APPROVED | 400 | Gate pass pending approval |
| SCANNER_OFFLINE | 503 | Gate scanner is offline |
| RATE_LIMITED | 429 | Too many requests |
| SESSION_EXPIRED | 401 | JWT token expired |
| INSUFFICIENT_PERMISSIONS | 403 | User role cannot perform this action |
| CORRECTION_WINDOW_EXPIRED | 400 | Log is older than 1 hour, cannot correct |


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 11 — MASTER PROMPT FOR IDE (COPY THIS ENTIRE BLOCK)
# ═══════════════════════════════════════════════════════════════════════════════

You are building the COMPLETE BACKEND for the Student Gate Monitoring System, which is Module 2 of the "Digital Campus Management & Monitoring Platform" for JNTUH University College of Engineering, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501.

STEP 0 — REFERENCE DATA:
Visit https://jntuhcej.ac.in/ and extract all college details. Use ONLY this data for branding and content.

STEP 1 — DATABASE SCHEMA (PostgreSQL):
Create these tables with proper indexes, constraints, and relationships:

1. departments (id, code, name, hod_faculty_id)
2. students (id, roll_number, name, email, phone, parent_name, parent_phone, parent_email, department_id, year, section, batch, photo_url, qr_uuid, id_card_valid_until, status)
   - INDEX on roll_number, qr_uuid, department_id, parent_phone
3. gates (id, name, location, type, status)
4. users (id, employee_id, name, email, phone, password_hash, role, assigned_gate_id, shift_start, shift_end, pin_hash, last_login, failed_login_attempts, locked_until, status)
   - INDEX on role, assigned_gate_id, employee_id
5. gate_logs (id, student_id, gate_id, operator_id, device_id, direction, reason, scan_method, timestamp, geo_location, is_validated, validation_notes, parent_notified, notification_sent_at)
   - INDEX on student_id, timestamp, gate_id, direction, DATE(timestamp), student_id+timestamp DESC
6. gate_pass_requests (id, student_id, request_type, from_datetime, to_datetime, reason, parent_approved, parent_approved_at, admin_approved, admin_approved_at, approved_by, status, digital_pass_qr, used_at, used_gate_id)
   - INDEX on student_id, status, from_datetime+to_datetime
7. campus_occupancy (id, student_id, current_status, last_gate_id, last_log_id, last_updated) — UNIQUE on student_id
   - INDEX on current_status, student_id
8. notifications (id, recipient_type, recipient_id, recipient_phone, recipient_email, type, title, message, data, channel, status, sent_at, read_at, error_message)
   - INDEX on recipient_type+recipient_id, status, type
9. audit_logs (id, table_name, record_id, action, old_values, new_values, changed_by, changed_by_role, reason, ip_address, user_agent, timestamp)
   - INDEX on table_name, record_id, changed_by, timestamp DESC
10. sessions (id, user_id, token, refresh_token, device_info, ip_address, expires_at, last_active, is_valid)
    - INDEX on user_id, token, is_valid
11. device_registry (id, device_id, device_name, device_type, assigned_gate_id, assigned_to, last_seen, status)
    - INDEX on device_id, assigned_gate_id

Create PostgreSQL triggers:
- update_campus_occupancy: AFTER INSERT on gate_logs → UPSERT campus_occupancy
- check_overdue_returns: AFTER INSERT on gate_logs → pg_notify if OUT with home_out/day_out/leave

STEP 2 — API ENDPOINTS (Express.js or Next.js API Routes):
Implement ALL these endpoints with proper validation, auth middleware, and RBAC:

AUTH:
- POST /auth/login — All roles. Return access_token + refresh_token + user profile.
- POST /auth/refresh — Refresh access token.
- POST /auth/logout — Invalidate session.
- POST /auth/pin-login — Gate Operator quick login with 4-digit PIN.

GATE OPERATOR:
- GET /gate/operator/dashboard — Last scan, today stats (entries/exits/on_campus), recent 5 scans.
- POST /gate/scan — Core endpoint. Body: qr_uuid, direction, reason, scan_method, device_id, geo_location.
  VALIDATION: QR exists, student active, ID not expired, not duplicate (5-min cooldown), direction logic, gate pass check if OUT.
  RESPONSE: Student details, scan confirmation, parent notification queued message.
  ERRORS: INVALID_QR, EXPIRED_ID, INACTIVE_STUDENT, DUPLICATE_SCAN, MISSING_REASON.
- POST /gate/scan/manual — Manual entry. Body: roll_number, direction, reason, supervisor_pin, device_id. Requires supervisor PIN verification.
- GET /gate/student/:roll_number — Search student for manual entry.

GATE SUPERVISOR:
- GET /gate/supervisor/logs — Filtered logs. Query: gate_id, date, direction, reason, search, page, limit.
- PUT /gate/supervisor/logs/:log_id — Correct log within 1 hour. Body: direction, reason, correction_reason. Audit logged.
- GET /gate/supervisor/passes — Pending gate passes for this gate.
- PUT /gate/supervisor/passes/:pass_id — Approve/reject pass.

ADMIN:
- GET /admin/dashboard — KPIs (on_campus, today_entries, today_exits, active_alerts), department breakdown, recent activity, alerts.
- GET /admin/analytics/occupancy — Time-series data. Query: from, to, interval.
- GET /admin/analytics/department/:dept_id — Department analytics.
- GET /admin/students/search — Cross-student search. Query: q, department, year, status.
- GET /admin/alerts — Filtered alerts. Query: severity, status, page.
- PUT /admin/alerts/:alert_id — Resolve/escalate/snooze.
- GET /admin/reports/generate — Generate reports. Query: type, date, format (pdf/excel).
- POST /admin/reports/schedule — Schedule recurring reports.

GATE PASSES:
- POST /gate-passes — Student requests pass. Body: request_type, from_datetime, to_datetime, reason.
  RULES: from_datetime must be future, to > from, max duration per type.
- GET /gate-passes/my — Student views own passes.
- GET /gate-passes/parent — Parent views child's passes.
- PUT /gate-passes/:pass_id/parent-approve — Parent approves/rejects.
- PUT /gate-passes/:pass_id/admin-approve — Admin approves/rejects.
- POST /gate-passes/:pass_id/scan — Scan digital pass QR at gate. Validates approval + time window.

STUDENT/PARENT:
- GET /students/:student_id/gate-history — Paginated gate history. Query: from, to, page.
- GET /students/:student_id/status — Current IN/OUT status + last scan + expected return.
- GET /parents/:parent_id/children — List children.

SYSTEM ADMIN:
- GET /system/devices — List registered devices.
- POST /system/devices — Register device.
- GET /system/audit-logs — Filtered audit. Query: table, user_id, from, to, action.
- GET /system/health — Health check (DB, Redis, backup, sessions, gate statuses).

STEP 3 — BUSINESS LOGIC:
Implement these rules in service layer:

1. QR Scan Validation Pipeline (8 steps):
   Authenticate operator → Validate QR exists → Check student status active → Check ID not expired → Check duplicate (5-min cooldown) → Check direction logic → Check gate pass if OUT → Create log → Update occupancy → Queue notifications → Emit real-time event.

2. Duplicate Prevention:
   Same student, same direction within 5 minutes = reject with DUPLICATE_SCAN error.

3. Direction Auto-Detection:
   If last scan was IN, suggest OUT. If last scan was OUT, suggest IN. Operator can override.

4. Photo Verification (Anti-Proxy):
   After QR scan, display student photo for 2 seconds before allowing confirmation. Backend accepts confirm only if delay passed.

5. Overdue Detection (Scheduled Job):
   Every 15 minutes, check students OUT with home_out/day_out/leave who have exceeded expected return time. Create critical alert + notify parent + admin + supervisor.

6. Gate Pass Validation:
   If reason is home_out/day_out/leave, check for approved gate pass within time window. If no pass, warn operator (requires supervisor confirmation).

7. Manual Entry:
   Requires supervisor PIN. Auto-set scan_method = 'manual'. Full audit log with reason.

8. Correction Window:
   Supervisors can edit logs only within 1 hour of creation. Must provide correction_reason. Old values preserved in audit_log.

STEP 4 — REAL-TIME (Socket.io):
Implement WebSocket server with room-based architecture:
- Rooms: global_room, admin_room, gate_:gate_id, supervisor_room, parent_:parent_id, student_:student_id
- Auth middleware: Verify JWT before socket connection.
- Events Server→Client: gate:scan, gate:occupancy_update, gate:alert, gate:scanner_offline, parent:notification, student:status_change
- Events Client→Server: join_gate, join_admin, join_parent, heartbeat
- Heartbeat: Gate operator sends heartbeat every 30s. If no heartbeat for 5 min → mark device offline → emit alert.

STEP 5 — NOTIFICATION SYSTEM (BullMQ + Redis):
Implement async queue with workers:
- Push Notification Worker → Firebase Cloud Messaging
- SMS Worker → Twilio API
- Email Worker → Nodemailer

Notification Types:
- gate_exit_home_out → Parent (Push + SMS)
- gate_exit_day_out → Parent (Push + SMS)
- gate_entry → Parent (Push silent)
- overdue_return → Parent + Admin + Supervisor (Push + SMS)
- gate_pass_request → Parent (Push + Email)
- gate_pass_approved → Student (Push)
- scanner_offline → Admin + Supervisor (Push + Email)
- unusual_pattern → Admin (Email)

Track delivery status: pending → sent → read / failed. Retry 3x with exponential backoff. Rate limit: max 5 SMS/hour, 10 push/hour, 3 email/day per parent.

STEP 6 — OFFLINE MODE:
- Gate operator app stores scans in IndexedDB when offline.
- POST /gate/scan/bulk endpoint accepts array of pending scans.
- Server validates each, returns per-scan results.
- Client clears synced records, shows errors.
- Conflict resolution: Server timestamp wins.

STEP 7 — AUDIT & COMPLIANCE:
- Audit every: gate scan create, gate scan correction, gate pass approve/reject, student status change, user role change, device register, failed login.
- Log: old_values, new_values, changed_by, changed_by_role, reason, ip_address, user_agent, timestamp.
- Retention: 1 year active, 7 years archived.
- Compliance: Data export on request, right to deletion after graduation, encryption at rest + in transit.

STEP 8 — PERFORMANCE:
- Partition gate_logs by month.
- Archive logs older than 1 year.
- Materialized views for daily/weekly aggregates.
- Connection pooling (PgBouncer, max 100).
- Redis caching: student lookups (1h), occupancy counts (5s), gate stats (1min), sessions (15-30min).
- API rate limiting: scan 60/min, dashboard 30/min, admin dashboard 10/min, login 5/min.
- Read replicas for analytics.

STEP 9 — ERROR HANDLING:
Standard response format: { success, data, error: { code, message, details }, meta: { timestamp, request_id } }
Error codes: INVALID_QR, EXPIRED_ID, INACTIVE_STUDENT, DUPLICATE_SCAN, INVALID_DIRECTION, MISSING_REASON, UNAUTHORIZED_GATE, SUPERVISOR_PIN_INVALID, GATE_PASS_INVALID, GATE_PASS_NOT_APPROVED, SCANNER_OFFLINE, RATE_LIMITED, SESSION_EXPIRED, INSUFFICIENT_PERMISSIONS, CORRECTION_WINDOW_EXPIRED.

STEP 10 — SECURITY:
- HTTPS everywhere. TLS 1.3.
- Passwords hashed with bcrypt (cost factor 12).
- JWT access tokens (15 min expiry) + refresh tokens (7 days).
- Rate limiting per endpoint.
- Input validation and sanitization (Zod schema).
- SQL injection prevention (parameterized queries via ORM).
- XSS protection (sanitize all outputs).
- CSRF tokens for web clients.
- Role-based API authorization middleware.
- IP logging for sensitive actions.

Build this backend using Node.js + Express (or Next.js API Routes), PostgreSQL with Prisma ORM, Redis for caching and sessions, Socket.io for real-time, BullMQ for async jobs, Firebase Admin SDK for push notifications, Twilio for SMS, and Winston for logging. Every endpoint must have proper auth middleware, validation, error handling, and audit logging.
````

## File: Plan/UI_Plan_Gate_Monitoring_System.md
````markdown
# 🎯 UI/UX PLAN — STUDENT GATE MONITORING SYSTEM
## JNTUH University College of Engineering, Nachupally (Kondagattu)

> **Master Prompt Applied:** World-class Product Designer, UX Architect, UI Designer, Design Systems Engineer & Frontend Engineer standard.
> **Source of Truth:** `gate/Gate_Monitoring_Master_Prompt.md` (Problem 2 — Student Gate Monitoring System)

---

# ═══════════════════════════════════════════════════════════════════════════════
# 1. PRODUCT INTERPRETATION
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 What This Product Is
A **real-time student gate monitoring system** that replaces the manual paper-register process at college gates with QR-code-based digital scanning, automated timestamps, role-based dashboards, parent notifications, and gate pass workflows.

## 1.2 What This Product Is NOT
- NOT a generic attendance system (no class/period tracking)
- NOT a social platform
- NOT a marketing website
- NOT a generic admin template

## 1.3 Product Type
Multi-surface enterprise SaaS with:
- **Dedicated hardware-like tablet app** (Gate Operator)
- **Supervisor desktop/tablet app**
- **Data-dense admin dashboard** (Principal/HOD)
- **Mobile-first parent app**
- **Mobile-first student app**

## 1.4 Core Value Proposition
> "From 3,000 handwritten entries/day to instant QR scans with zero cognitive load, real-time campus visibility, and automatic parent notifications."

## 1.5 Primary Business Objective
Eliminate manual gate registers; provide real-time campus occupancy intelligence; ensure student safety through parent notification; create an auditable, searchable, tamper-proof record.

---

# ═══════════════════════════════════════════════════════════════════════════════
# 2. USER / PERSONA ASSUMPTIONS
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Persona A — Gate Operator (Security Guard)
| Attribute | Value |
|-----------|-------|
| Age | 35–55 |
| Technical skill | LOW — may have never used a tablet |
| Context | Outdoor gate, bright sunlight, standing, gloves, rush hours |
| Device | 10-inch Android tablet, landscape |
| Session length | 8-hour shift, continuous use |
| Primary goal | Scan a student's QR and record entry/exit in < 3 seconds |
| Secondary goal | Handle damaged QR via manual entry |
| Cognitive load budget | ZERO — one action at a time |
| Failure mode | If screen is confusing, guard reverts to paper register |

**Design implication:** The Gate Operator screen must be the simplest screen in the entire product. No navigation, no charts, no settings. A physical-device feel.

## 2.2 Persona B — Gate Supervisor (Senior Security)
| Attribute | Value |
|-----------|-------|
| Technical skill | MEDIUM |
| Context | Gate office, seated, tablet/desktop |
| Primary goal | Review today's logs, correct errors (last 1 hr), manage gate passes |
| Secondary goal | Export shift handover PDF |
| Session length | Intermittent, 15–30 min blocks |

## 2.3 Persona C — Admin (Principal / HOD)
| Attribute | Value |
|-----------|-------|
| Technical skill | MEDIUM-HIGH |
| Context | Office desktop, dark mode, data-dense |
| Primary goal | Real-time campus occupancy, alerts, trends, gate pass approvals |
| Secondary goal | Export reports, investigate incidents |
| Session length | 10–20 min, 2–3 times/day |
| Data density | HIGH — wants maximum information per screen |

## 2.4 Persona D — System Administrator (IT Staff)
| Attribute | Value |
|-----------|-------|
| Technical skill | HIGH |
| Context | Desktop |
| Primary goal | Manage users, roles, gates, devices, API keys, backups |
| Session length | As needed |

## 2.5 Persona E — Parent
| Attribute | Value |
|-----------|-------|
| Technical skill | VARIED (low–medium) |
| Context | Mobile, on-the-go, possibly anxious |
| Primary goal | Know instantly when child leaves/enters campus |
| Secondary goal | Approve/reject gate pass requests |
| Emotional state | May be anxious — notifications must be calm, clear, reassuring |

## 2.6 Persona F — Student
| Attribute | Value |
|-----------|-------|
| Technical skill | HIGH |
| Context | Mobile, at gate, in a hurry |
| Primary goal | Show digital ID QR quickly (auto-max brightness) |
| Secondary goal | Request gate pass, view history |
| Emotional state | Impatient — QR must open in < 1 second |

## 2.7 Assumptions (Explicitly Stated)
1. College has ~1,500 students across 5 departments (CSE, IT, ECE, EEE, ME).
2. 3 gates: Gate 1 (Main), Gate 2 (Hostel), Gate 3 (Back/Staff).
3. Peak rush: 8:00–9:30 AM (entry) and 4:00–5:30 PM (exit).
4. Internet at gates may be unreliable → offline mode required.
5. Parents have smartphones with push notification capability; SMS as fallback.
6. Students have smartphones; digital ID is acceptable (printed QR backup cards also issued).
7. Hindi/Telugu/English — interface copy in English (college medium), with Telugu support considered for Gate Operator as future enhancement.

---

# ═══════════════════════════════════════════════════════════════════════════════
# 3. INFORMATION ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 Global Navigation Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GATE MONITOR SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ROLE: GATE OPERATOR          ROLE: GATE SUPERVISOR                 │
│  ┌──────────────────────┐    ┌──────────────────────┐               │
│  │ Scanner (single view)│    │ Live Gate            │               │
│  │  • Camera            │    │ Today's Logs         │               │
│  │  • Last Scan         │    │ Corrections          │               │
│  │  • Today's Stats     │    │ Gate Passes          │               │
│  │  • Recent 5 Scans    │    └──────────────────────┘               │
│  └──────────────────────┘                                           │
│                                                                     │
│  ROLE: ADMIN (Principal/HOD)   ROLE: SYSTEM ADMIN                   │
│  ┌──────────────────────┐    ┌──────────────────────┐               │
│  │ Dashboard            │    │ Users & Roles        │               │
│  │  • KPIs              │    │ Gates & Devices      │               │
│  │  • Live Campus Map   │    │ API Keys             │               │
│  │  • Activity Feed     │    │ Backups              │               │
│  │  • Dept Breakdown    │    │ System Settings      │               │
│  │  • Alerts            │    └──────────────────────┘               │
│  │  • Gate Pass Mgmt    │                                           │
│  │  • Attendance        │                                           │
│  │  • Students          │                                           │
│  │  • Reports           │                                           │
│  └──────────────────────┘                                           │
│                                                                     │
│  ROLE: PARENT                    ROLE: STUDENT                      │
│  ┌──────────────────────┐    ┌──────────────────────┐               │
│  │ Child Status         │    │ Digital ID (QR)      │               │
│  │ Today's Timeline     │    │ Gate History         │               │
│  │ Weekly Summary       │    │ Request Gate Pass    │               │
│  │ Gate Pass Approvals  │    │ Track Pass Status    │               │
│  └──────────────────────┘    └──────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 3.2 Page Hierarchy (Admin — most complex)

```
Level 1: Dashboard (default landing)
Level 2: Attendance | Students | Reports | Alerts | Settings
Level 3: Student detail | Report detail | Alert detail | Gate pass detail
Level 4: Edit forms, export dialogs, confirmation modals
```

## 3.3 Primary vs Secondary Actions

| Screen | Primary Action (1) | Secondary Actions |
|--------|-------------------|-------------------|
| Gate Operator | Scan QR | Manual entry, refresh stats |
| Scan Confirmation | Confirm Entry/Exit | Cancel, change direction |
| Supervisor Logs | Search/Filter | Export PDF, edit record |
| Admin Dashboard | Monitor live status | Approve passes, view reports |
| Parent App | View child status | Approve pass, view timeline |
| Student App | Show QR | Request pass, view history |

## 3.4 Key User Journeys

### Journey 1 — Normal Entry (most frequent)
```
Student approaches gate
→ Guard's camera is already active
→ Student shows QR
→ Scan (BEEP + VIBRATE + flash)
→ Student photo + details appear (2s verification)
→ Guard taps [CONFIRM ENTRY]
→ Green success flash (1s)
→ Auto-reset to camera
→ Parent gets silent push notification
```
**Target time: < 5 seconds total**

### Journey 2 — Normal Exit
```
Student approaches gate
→ Scan
→ Photo verification
→ Guard taps [CONFIRM EXIT]
→ Reason selector appears (Home Out / Day Out / Leave / Regular)
→ Guard taps reason
→ Green success flash
→ Parent gets Push + SMS notification
```

### Journey 3 — Gate Pass Request
```
Student opens app → Request Gate Pass
→ Fills form (reason, from, to, description)
→ Status: PENDING
→ Parent notified → Approve/Reject
→ Admin notified → Final Approve/Reject
→ Student gets digital pass QR
→ At gate: scan pass QR → auto-allows exit with reason pre-filled
→ On return: scan → auto-logs entry, closes pass
```

### Journey 4 — Manual Entry (Damaged QR)
```
Guard taps [Manual Entry]
→ Supervisor PIN required (audit trail)
→ Numeric keypad appears
→ Enter roll number
→ Search → Select student
→ Proceed with normal confirmation flow
```

### Journey 5 — Incident Investigation (Admin)
```
Admin sees alert → Clicks alert
→ Student detail page opens
→ Full gate history timeline
→ Export report PDF
→ Notify parent/HOD
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# 4. USER FLOWS (Detailed)
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 Gate Operator — Scan Flow State Machine

```
┌─────────┐     scan     ┌──────────────┐   valid QR   ┌──────────────────┐
│ CAMERA  │ ───────────▶ │ VERIFYING    │ ───────────▶ │ STUDENT DETAILS  │
│ ACTIVE  │              │ (spinner)    │              │ (photo 2s lock)  │
└─────────┘              └──────────────┘              └────────┬─────────┘
     ▲                                                          │
     │                                                          ▼
     │                                                   ┌──────────────┐
     │                                                   │ DIRECTION    │
     │                                                   │ SELECT       │
     │                                                   │ [IN] [OUT]   │
     │                                                   └──────┬───────┘
     │                                                          │
     │                                                          ▼
     │                                                   ┌──────────────┐
     │                                                   │ EXIT REASON  │
     │                                                   │ (if OUT)     │
     │                                                   └──────┬───────┘
     │                                                          │
     │                                                          ▼
     │                                                   ┌──────────────┐
     │                                                   │ SUCCESS FLASH│
     │                                                   │ (green, 1s)  │
     │                                                   └──────┬───────┘
     │                                                          │
     └──────────────────────────────────────────────────────────┘
                          auto-reset

Error branches:
- Invalid QR → Red error card → auto-reset after 3s
- Expired ID → Orange warning → guard can still proceed with override
- Duplicate scan (< 5 min) → "Already recorded" → auto-reset
- Offline → Local save → "Offline — 12 scans queued" indicator
```

## 4.2 Admin — Alert Resolution Flow

```
Alert appears in panel
→ Click alert
→ Detail drawer opens (student, gate, time, context)
→ Actions: [View Student] [Notify Parent] [Dismiss] [Escalate]
→ Each action logs to audit trail
```

## 4.3 Parent — Gate Pass Approval Flow

```
Push notification: "Gate pass request from [Student]"
→ Tap → Opens app → Pass request card
→ [Approve] / [Reject] with optional comment
→ Confirmation toast
→ Status updates in student app
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# 5. DESIGN DIRECTION
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 Visual Language Selection

| Surface | Visual Language | Rationale |
|---------|----------------|-----------|
| Gate Operator | **Dedicated hardware device** — minimal, high-contrast, dark, zero chrome | Outdoor sunlight visibility, low cognitive load, feels like a purpose-built scanner |
| Gate Supervisor | **Utility tool** — clean, functional, medium density | Information review + corrections |
| Admin Dashboard | **Authority command center** — dark, data-dense, precise | Principal needs maximum situational awareness |
| Parent App | **Calm & reassuring** — light, soft, warm | Anxious parents; clarity over decoration |
| Student App | **Modern & crisp** — light, confident, fast | Young users; speed matters |

## 5.2 Distinctive Product Elements (Anti-Generic)

1. **The Scan Ring** — A circular reticle in the camera viewfinder with animated corner brackets. This is the product's signature visual. It communicates "scan here" without words.
2. **Direction Color Language** — Green = ENTRY, Red = EXIT, Orange = Day Out, Blue = Leave. Used consistently across ALL surfaces (operator, supervisor, admin, parent, student).
3. **The Pulse Dot** — Live campus map locations use a pulsing dot (green = active, red = alert). Instantly readable.
4. **Success Flash** — Full-screen green flash overlay (1s) after every confirmed scan. Physical, satisfying feedback.
5. **Photo Verification Lock** — Student photo displayed for 2 seconds with a shrinking progress ring before confirm buttons enable. This is a security feature made visible.
6. **Offline Queue Indicator** — A persistent amber pill showing queued scans count. Honest system status.

## 5.3 What We Deliberately Avoid
- ❌ Random gradients
- ❌ Glassmorphism (except subtle on overlays)
- ❌ Excessive shadows
- ❌ Decorative illustrations
- ❌ Generic "AI website" hero sections
- ❌ Unnecessary animations that delay tasks
- ❌ More than 3 accent colors per surface
- ❌ Giant rounded cards everywhere (tables are used where tables belong)

---

# ═══════════════════════════════════════════════════════════════════════════════
# 6. DESIGN TOKENS
# ═══════════════════════════════════════════════════════════════════════════════

## 6.1 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family` | Inter (system fallback: -apple-system, Segoe UI) | ALL text |
| `--text-display` | 32px / 40px / 700 / -0.02em | Admin KPI numbers |
| `--text-h1` | 24px / 32px / 700 / -0.01em | Page titles |
| `--text-h2` | 20px / 28px / 600 | Section headers |
| `--text-h3` | 16px / 24px / 600 | Card titles |
| `--text-body` | 14px / 20px / 400 | Default body |
| `--text-body-sm` | 13px / 18px / 400 | Dense tables |
| `--text-caption` | 12px / 16px / 500 | Labels, timestamps |
| `--text-overline` | 11px / 14px / 600 / 0.08em uppercase | Section overlines |
| `--text-operator-hero` | 28px / 36px / 700 | Operator student name |
| `--text-operator-stat` | 40px / 48px / 700 | Operator stat numbers |

**Operator screen typography is LARGER** — outdoor readability at arm's length.

## 6.2 Spacing Scale (Strict)

```
4   8   12   16   24   32   48   64   96   128
```

No other values. No exceptions.

## 6.3 Color Tokens — Dark Surfaces (Operator, Supervisor, Admin)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0F172A` (slate-900) | Operator background |
| `--bg-surface` | `#1E293B` (slate-800) | Cards, panels |
| `--bg-elevated` | `#334155` (slate-700) | Modals, popovers |
| `--text-primary` | `#F8FAFC` (slate-50) | Primary text |
| `--text-secondary` | `#CBD5E1` (slate-300) | Secondary text |
| `--text-muted` | `#94A3B8` (slate-400) | Muted, captions |
| `--border` | `#334155` (slate-700) | Borders, dividers |
| `--border-strong` | `#475569` (slate-600) | Stronger borders |
| `--action-primary` | `#10B981` (emerald-500) | Confirm Entry, success |
| `--action-danger` | `#EF4444` (red-500) | Confirm Exit, errors |
| `--action-warning` | `#F59E0B` (amber-500) | Day Out, warnings |
| `--action-info` | `#3B82F6` (blue-500) | Leave, info |
| `--focus-ring` | `#38BDF8` (sky-400) | Keyboard focus |

## 6.4 Color Tokens — Light Surfaces (Parent, Student)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#F8FAFC` (slate-50) | App background |
| `--bg-surface` | `#FFFFFF` | Cards |
| `--bg-elevated` | `#FFFFFF` + shadow | Modals |
| `--text-primary` | `#0F172A` (slate-900) | Primary text |
| `--text-secondary` | `#475569` (slate-600) | Secondary text |
| `--text-muted` | `#94A3B8` (slate-400) | Muted |
| `--border` | `#E2E8F0` (slate-200) | Borders |
| `--action-primary` | `#059669` (emerald-600) | Primary buttons |
| `--action-danger` | `#DC2626` (red-600) | Destructive |
| `--action-warning` | `#D97706` (amber-600) | Warnings |
| `--action-info` | `#2563EB` (blue-600) | Info |

## 6.5 Semantic Status Colors (Consistent Across ALL Surfaces)

| Status | Color | Icon |
|--------|-------|------|
| ENTRY | Green `#10B981` | ⬇️ Arrow down-left |
| EXIT — Home Out | Red `#EF4444` | ⬆️ Arrow up-right |
| EXIT — Day Out | Orange `#F59E0B` | ☀️ |
| EXIT — Leave | Blue `#3B82F6` | 📝 |
| EXIT — Regular | Red `#EF4444` | 🚶 |
| On Campus | Green pulse | ● |
| Offline | Amber `#F59E0B` | 📡 |
| Error | Red `#EF4444` | ⚠️ |
| Success | Green `#10B981` | ✓ |

## 6.6 Radius & Elevation

| Token | Value |
|-------|-------|
| `--radius-sm` | 6px (badges, chips) |
| `--radius-md` | 10px (buttons, inputs) |
| `--radius-lg` | 12px (cards) |
| `--radius-xl` | 16px (modals, large cards) |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.1)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.15)` |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.25)` |

## 6.7 Motion Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 120ms | Hover, active states |
| `--duration-normal` | 200ms | Default transitions |
| `--duration-slow` | 300ms | Modals, overlays |
| `--duration-success` | 1000ms | Success flash |
| `--ease-default` | cubic-bezier(0.4, 0, 0.2, 1) | All motion |
| `--ease-spring` | spring(200, 20) | Scan success pop |

**Reduced motion:** All animations disabled or reduced to opacity-only when `prefers-reduced-motion: reduce`.

---

# ═══════════════════════════════════════════════════════════════════════════════
# 7. PAGE / SCREEN STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════

## 7.1 SCREEN 1 — GATE OPERATOR (Tablet Landscape, Dark)

### Layout Grid
```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER (64px)                                                        │
│ 🏛️ JNTUH-UCoEJ · Gate 1 (Main)          👤 Op #3   🔋 85%   ⋮       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    CAMERA VIEWFINDER (60% height)                    │
│                    ┌──────────────────────────┐                      │
│                    │   Scan Ring reticle      │                      │
│                    │   "Align QR within frame"│                      │
│                    └──────────────────────────┘                      │
│                                                                      │
│              [ 🔲 MANUAL ENTRY ]  (48px height)                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ LAST SCAN CARD (auto-updates)                                        │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ 👤 21CSE045 · K. RAHUL · CSE 3rd Year · 🟢 ENTRY · 09:12:43 AM  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ STATS ROW (3 cards, 48px gap)                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                               │
│ │ ENTRIES  │ │ EXITS    │ │ ON CAMPUS│                               │
│ │ 1,247    │ │ 312      │ │ 935      │                               │
│ └──────────┘ └──────────┘ └──────────┘                               │
│                                                                      │
│ RECENT SCANS (last 5, compact rows)                                  │
│ • 09:12 — 21CSE045 — ENTRY                                           │
│ • 09:11 — 21ECE032 — EXIT (Home Out)                                 │
│ • 09:10 — 21ME089  — ENTRY                                           │
│ • 09:08 — 21IT076  — ENTRY                                           │
│ • 09:07 — 21EEE054 — EXIT (Day Out)                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Rules
- Camera ALWAYS active on top 60%. No idle screen.
- NO sidebar. NO charts. NO settings. NO visible logout.
- Triple-tap top-right corner → hidden logout (with confirmation).
- All touch targets ≥ 48×48px.
- Font sizes ≥ 16px for body content on this screen.
- Offline indicator: amber pill top-right when offline.

## 7.2 SCREEN 2 — SCAN CONFIRMATION OVERLAY (Modal)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ┌───────────────┐                         │
│                    │  Student      │                         │
│                    │  Photo        │                         │
│                    │  (circular)   │                         │
│                    └───────────────┘                         │
│                                                              │
│              K. RAHUL  (28px, bold)                          │
│              21CSE045  (20px, mono)                          │
│              CSE — 3rd Year                                  │
│                                                              │
│              Last Status: OUT at 4:30 PM                     │
│                                                              │
│              ┌──────────────────────────────┐                │
│              │  🟢 CONFIRM ENTRY            │  (64px h)     │
│              └──────────────────────────────┘                │
│                                                              │
│              ┌──────────────────────────────┐                │
│              │  🔴 CONFIRM EXIT             │  (64px h)     │
│              └──────────────────────────────┘                │
│                                                              │
│                        [ CANCEL ]                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Photo Verification Lock
- On open: photo + details shown, buttons DISABLED for 2 seconds.
- A shrinking progress ring around the photo communicates the countdown.
- After 2s: buttons enable with subtle scale-in.
- This prevents proxy scanning (someone else's card).

### Exit Reason Selector (after CONFIRM EXIT)
```
┌──────────────────────────────────────────────┐
│  Select reason for exit:                     │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  🏠 HOME OUT                           │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  ☀️ DAY OUT                            │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  📝 LEAVE                              │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  🚶 REGULAR                            │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                    [ BACK ]                  │
└──────────────────────────────────────────────┘
```

### Success Flash
- Full-screen green overlay with large ✓.
- 1 second duration → auto-reset to camera.
- Spring scale animation on the checkmark.

## 7.3 SCREEN 3 — GATE SUPERVISOR (Tablet/Desktop)

### Tab Structure
```
┌──────────────────────────────────────────────────────────────┐
│ [ LIVE GATE ]  [ TODAY'S LOGS ]  [ CORRECTIONS ]  [ PASSES ] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TAB CONTENT (varies)                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Tab 1 — Live Gate
- Same as operator + status strip:
  - "Current Shift: 6 AM — 2 PM"
  - "Operator on duty: Guard #3"
  - "Scanner status: Online 🟢"

### Tab 2 — Today's Logs
- Full table: Time | Roll No | Name | Direction | Reason | Gate | Operator | Action
- Search bar (roll/name) — debounced 300ms
- Filters: All | Entry | Exit | Home Out | Day Out | Leave
- Export PDF button (top-right)
- Pagination: 25 rows/page
- Row hover: subtle background change
- Row click: opens detail drawer

### Tab 3 — Corrections
- Records editable within last 1 hour only
- Each row: Original data → [Edit] → Form → Save
- Edit requires: reason (required textarea) + supervisor PIN
- Audit trail shown: "Edited by S. Kumar at 10:15 AM — 'Wrong direction selected'"

### Tab 4 — Gate Passes
- Pending requests for this gate
- Card list: Student | Reason | From → To | [Approve] [Reject]
- Approve/Reject requires comment (optional for approve, required for reject)

## 7.4 SCREEN 4 — ADMIN DASHBOARD (Desktop, Dark, Data-Dense)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ LOGO  Gate Monitor │ Attendance │ Students │ Reports │ Alerts │ ⚙️   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SECTION 1 — EXECUTIVE KPIs (4 cards, grid)                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│  │ ON CAMPUS  │ │ TODAY OUT  │ │ SCANS      │ │ ALERTS     │        │
│  │ 1,247      │ │ 312        │ │ 1,559      │ │ 3          │        │
│  │ 🟢 +12     │ │ 🔴 +45     │ │ 🟡 Normal  │ │ 🔴 Critical│        │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
│                                                                      │
│  SECTION 2 — LIVE CAMPUS MAP (left, 60%)   SECTION 3 — ACTIVITY      │
│  ┌──────────────────────────────┐         │ FEED (right, 40%)        │
│  │ SVG campus layout            │         │ ┌────────────────────┐   │
│  │ Gate 1: 1,247 ●              │         │ │ 09:12 ENTRY ...    │   │
│  │ Gate 2: 892  ●               │         │ │ 09:11 EXIT ...     │   │
│  │ Library: 456 ●               │         │ │ 09:10 ENTRY ...    │   │
│  │ Canteen: 234 ●               │         │ │ (auto-refresh 5s)  │   │
│  └──────────────────────────────┘         │ └────────────────────┘   │
│                                                                      │
│  SECTION 4 — DEPARTMENT BREAKDOWN (bar chart)                        │
│  CSE ████████████ 312 IN | 45 OUT | 87%                              │
│  ECE ██████████   278 IN | 38 OUT | 88%                              │
│  IT  █████████    245 IN | 30 OUT | 89%                              │
│  EEE ████████     198 IN | 25 OUT | 89%                              │
│  ME  ████████     214 IN | 28 OUT | 88%                              │
│                                                                      │
│  SECTION 5 — ALERTS PANEL                                            │
│  🔴 Critical: Student 21CSE045 Home Out 4PM, not returned            │
│  🟡 Warning: Gate 2 scanner offline 5 min                            │
│  🔵 Info: Shift change Gate 1 — 2 PM                                 │
│                                                                      │
│  SECTION 6 — GATE PASS MANAGEMENT (table)                            │
│  Student | Roll | Reason | From | To | Requested By | Status | Act   │
│  [Bulk Approve] [Bulk Reject]                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Density Rules
- Tables used for tabular data (NOT cards)
- Max 3 accent colors visible at once
- Numbers use tabular-nums font feature
- All KPI numbers: 32px, bold, tabular
- Activity feed: auto-refresh every 5s via WebSocket, new items animate in from top
- Skeleton loaders on first fetch

## 7.5 SCREEN 5 — PARENT APP (Mobile, Light)

### Push Notification
```
┌─────────────────────────────────────────┐
│  🏛️ JNTUH-UCoEJ                        │
│                                         │
│  Your ward K. RAHUL (21CSE045)          │
│  has LEFT the campus.                   │
│                                         │
│  Reason: Home Out                       │
│  Time: 04:30 PM                         │
│  Expected Return: Tomorrow 8:00 AM      │
│                                         │
│  [ VIEW DETAILS ]                       │
└─────────────────────────────────────────┘
```

### App Screens
1. **Child Status (Home)**
   - Child card: Photo, Name, Roll, Dept, Status badge (🟢 IN / 🔴 OUT)
   - Large status indicator — readable at a glance
   - Today's Timeline: vertical line with dots
     - 8:00 AM — ENTRY (green dot)
     - 4:30 PM — EXIT Home Out (red dot)
   - Weekly summary: compact bar chart of entry/exit times

2. **Gate Pass Approvals**
   - Request cards: Student | Reason | From → To
   - [Approve] [Reject] buttons (44px min)
   - Optional comment field

3. **Settings**
   - Notification preferences (push/SMS toggle)
   - Multiple children support (if applicable)

## 7.6 SCREEN 6 — STUDENT APP (Mobile, Light)

### Digital ID Card
- Full-screen QR code (auto-max brightness on open)
- Student photo, name, roll, dept, valid-until date
- "Show this at gate for scanning" caption
- QR regenerates with timestamp (anti-replay) — optional enhancement

### My Gate History
- Calendar view with color dots (green = entry, red = exit)
- Tap day → detailed log list

### Request Gate Pass
- Form: Reason (dropdown) | From Date/Time | To Date/Time | Description
- Submit → PENDING status
- Track status: Pending / Approved / Rejected (with timeline)

---

# ═══════════════════════════════════════════════════════════════════════════════
# 8. COMPONENT SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

## 8.1 Component Inventory

| Component | Variants | Used On |
|-----------|----------|---------|
| Button | Primary / Secondary / Danger / Ghost / Icon / Loading | All |
| Button (Operator) | ENTRY (green, 64px) / EXIT (red, 64px) / Reason (full-width) | Operator |
| Input | Text / Numeric / Search / With-icon / Error / Disabled | All |
| Select | Dropdown / Native (mobile) | All |
| Card | Default / Interactive / Stat / Last-scan | All |
| Table | Dense / With-actions / Sortable / Selectable | Supervisor, Admin |
| Tabs | Underline / Pills | Supervisor, Admin |
| Badge | Status (green/red/orange/blue) / Count / Offline | All |
| Alert | Critical / Warning / Info / Success | Admin, Operator |
| Toast | Success / Error / Info | All |
| Modal | Confirmation / Form / Detail-drawer | All |
| Drawer | Right-side detail panel | Supervisor, Admin |
| Avatar | Photo / Initials / Status-ring | All |
| Skeleton | Card / Table / List | All |
| Empty State | Icon + Title + Description + Action | All |
| Pagination | Numbered / Prev-Next | Supervisor, Admin |
| Breadcrumb | Simple | Admin |
| Tooltip | Top / Bottom | Admin |
| Progress Ring | Photo verification countdown | Operator |
| Scan Reticle | Animated corner brackets | Operator |
| Pulse Dot | Live location indicator | Admin |
| Stat Card | Label + Value + Delta | Operator, Admin |
| Timeline | Vertical with dots | Parent, Student |
| Calendar | Month view with dots | Student |
| KPI Card | Value + Trend + Icon | Admin |

## 8.2 Button Specifications

| Property | Default | Operator Primary | Operator Danger |
|----------|---------|------------------|-----------------|
| Height | 44px | 64px | 64px |
| Padding | 16px 24px | 24px | 24px |
| Radius | 10px | 12px | 12px |
| Font | 14px/600 | 18px/700 | 18px/700 |
| Background | `--action-primary` | `#10B981` | `#EF4444` |
| Hover | +8% brightness | +8% brightness | +8% brightness |
| Active | scale(0.98) | scale(0.98) | scale(0.98) |
| Focus | 2px ring `--focus-ring` | 2px ring | 2px ring |
| Disabled | 40% opacity | 40% opacity | 40% opacity |
| Loading | Spinner replaces icon | — | — |

## 8.3 Input Specifications

| Property | Value |
|----------|-------|
| Height | 44px |
| Padding | 12px 16px |
| Radius | 10px |
| Border | 1px `--border` |
| Focus | 2px ring `--focus-ring` + border color change |
| Error | 1px `--action-danger` + error message below (icon + text) |
| Label | 12px/600 uppercase, 8px gap |
| Helper | 12px `--text-muted` |

## 8.4 Table Specifications

| Property | Value |
|----------|-------|
| Header | 12px/600 uppercase, `--text-muted`, 8px bottom border |
| Row height | 44px (dense) / 52px (default) |
| Row hover | `--bg-surface` subtle change |
| Row selected | `--action-primary` at 8% opacity |
| Cell padding | 12px 16px |
| Sort indicator | Arrow icon, active column highlighted |
| Empty state | Centered icon + "No records found" + action button |

## 8.5 Status Badge Specifications

| Property | Value |
|----------|-------|
| Height | 24px |
| Padding | 4px 10px |
| Radius | 999px (pill) |
| Font | 12px/600 |
| Background | Color at 12% opacity |
| Text | Full color |
| Dot | 6px circle before text |

---

# ═══════════════════════════════════════════════════════════════════════════════
# 9. INTERACTION STATES
# ═══════════════════════════════════════════════════════════════════════════════

## 9.1 Universal State Matrix

| State | Visual | Timing |
|-------|--------|--------|
| Default | Normal colors | — |
| Hover | +8% brightness, subtle shadow | 120ms |
| Focus | 2px `--focus-ring` ring, visible on keyboard nav | 120ms |
| Active | scale(0.98) | 120ms |
| Disabled | 40% opacity, no pointer | — |
| Loading | Spinner replaces icon, button disabled | — |
| Success | Green flash / checkmark | 1000ms |
| Error | Red border + message | — |

## 9.2 Scan-Specific Interactions

| Event | Feedback |
|-------|----------|
| QR detected | BEEP (short, high) + VIBRATE (50ms) + white flash overlay |
| Valid student | Green border pulse on student card |
| Invalid QR | Red error card + error tone (low buzz) |
| Duplicate scan | Amber "Already recorded" + soft tone |
| Confirm success | Full-screen green flash + spring checkmark + success tone |
| Offline save | Amber pill "Offline — N queued" + subtle pulse |

## 9.3 Navigation Interactions

| Element | Hover | Active | Current |
|---------|-------|--------|---------|
| Admin nav item | bg-surface | scale(0.98) | Left border 3px `--action-primary` + bg-surface |
| Tab | text brightens | scale(0.98) | Underline 2px `--action-primary` |
| Table row | bg-surface | scale(0.995) | — |

## 9.4 Form Validation

| State | Visual |
|-------|--------|
| Invalid on blur | Red border + icon + message below |
| Valid on blur | Green check icon (subtle) |
| Submit with errors | Scroll to first error + shake (200ms, reduced-motion: none) |
| Submit success | Success toast + form reset |

---

# ═══════════════════════════════════════════════════════════════════════════════
# 10. RESPONSIVE BEHAVIOR
# ═══════════════════════════════════════════════════════════════════════════════

## 10.1 Breakpoint Strategy

| Breakpoint | Target | Primary Surfaces |
|------------|--------|------------------|
| < 480px | Small mobile | Parent, Student |
| 480–768px | Large mobile | Parent, Student |
| 768–1024px | Tablet portrait | Supervisor (adapted) |
| 1024–1366px | Tablet landscape | **Operator (optimized)**, Supervisor |
| 1366–1920px | Laptop/Desktop | Admin, Supervisor |
| > 1920px | Large desktop | Admin |

## 10.2 Per-Surface Responsive Rules

### Gate Operator (Tablet Landscape — PRIMARY)
- Fixed landscape orientation (rotate hint if portrait)
- Layout: header (64px) + camera (60%) + stats (fixed)
- No responsive breakpoints needed — it's a dedicated device
- If screen smaller than 1024px: reduce camera to 50%, stats to 2 columns

### Gate Supervisor
- Tablet landscape: tabs remain, table becomes horizontally scrollable
- Desktop: full table with sticky header
- Corrections tab: cards on tablet, table on desktop

### Admin Dashboard
- Desktop (primary): 12-column grid
  - KPIs: 4 columns each (full row)
  - Map + Feed: 7/5 split
  - Dept + Alerts: 6/6 split
  - Passes: full width
- Tablet: 
  - KPIs: 2×2 grid
  - Map + Feed: stacked
  - Tables: horizontal scroll
- Mobile (not primary, but functional):
  - KPIs: 2×2
  - All sections stacked
  - Nav collapses to hamburger

### Parent App (Mobile-First)
- Single column, bottom navigation (3 tabs: Child | Passes | Settings)
- Timeline: full-width vertical
- Weekly chart: horizontal scroll if needed

### Student App (Mobile-First)
- Single column
- QR: full-screen, centered, max-width 320px
- Calendar: standard month grid
- Bottom navigation (3 tabs: ID | History | Passes)

## 10.3 Touch Target Minimums
- ALL interactive elements: 44×44px minimum
- Operator screen: 48×48px minimum
- Operator primary buttons: 64px height
- Bottom nav items: 56px height

## 10.4 Typography Scaling
- Use `clamp()` for fluid type on responsive surfaces:
  - Body: `clamp(14px, 1vw + 12px, 16px)`
  - H1: `clamp(20px, 2vw + 14px, 32px)`
  - KPI numbers: `clamp(24px, 2vw + 18px, 40px)`
- Operator screen: FIXED sizes (no scaling) — outdoor readability

---

# ═══════════════════════════════════════════════════════════════════════════════
# 11. ACCESSIBILITY CONSIDERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

## 11.1 Contrast Compliance (WCAG 2.1 AA)

| Pair | Ratio | Status |
|------|-------|--------|
| `--text-primary` on `--bg-base` (dark) | 15.9:1 | ✅ AAA |
| `--text-secondary` on `--bg-base` (dark) | 9.1:1 | ✅ AAA |
| `--text-muted` on `--bg-base` (dark) | 5.9:1 | ✅ AA |
| White on `--action-primary` (#10B981) | 3.1:1 | ⚠️ AA large text only — use white 18px+ bold for buttons |
| White on `--action-danger` (#EF4444) | 3.9:1 | ⚠️ AA large text only — use white 18px+ bold |
| `--text-primary` on `--bg-surface` (light) | 16.3:1 | ✅ AAA |
| `--text-secondary` on `--bg-surface` (light) | 7.6:1 | ✅ AAA |

**Note:** Operator buttons use 18px/700 white text — meets AA large-text requirement.

## 11.2 Keyboard Navigation
- All interactive elements reachable via Tab
- Visible focus ring (2px `--focus-ring`, offset 2px)
- Focus order matches visual order
- Modals: focus trap + Escape to close + focus returns to trigger
- Tables: sortable headers are buttons, arrow keys navigate rows (optional enhancement)
- Skip-to-content link on admin dashboard

## 11.3 Semantic HTML
- `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` used correctly
- Tables use `<th scope="col">` / `<th scope="row">`
- Buttons are `<button>`, links are `<a>`
- Forms: `<label>` associated with `<input>` via `for`/`id`
- Error messages: `aria-describedby` linking input to error text
- Live regions: `aria-live="polite"` for activity feed, `aria-live="assertive"` for scan results

## 11.4 Screen Reader Support
- Scan result announced: "Entry confirmed for K. Rahul, roll 21 C S E 0 4 5, at 9:12 AM"
- Status changes announced via live regions
- Icons have `aria-hidden="true"` + text alternatives
- QR code has `alt` text: "Student ID QR code for K. Rahul"
- Charts have data tables as fallback (screen-reader accessible)

## 11.5 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- Success flash becomes static green overlay (no spring)
- Pulse dots become static
- Scan flash becomes opacity-only

## 11.6 Color Independence
- Direction is NEVER communicated by color alone
- ENTRY: green + ⬇️ icon + "ENTRY" text
- EXIT: red + ⬆️ icon + "EXIT" text
- Status badges always include text label
- Alerts include icon + severity text (Critical/Warning/Info)

## 11.7 Form Accessibility
- Labels visible (not placeholder-only)
- Error messages: icon + text, linked via `aria-describedby`
- Required fields marked with `*` + `aria-required`
- Validation on blur (not aggressive on-change)
- Success confirmation via toast + `aria-live`

---

# ═══════════════════════════════════════════════════════════════════════════════
# 12. EDGE CASES & STATE DESIGN
# ═══════════════════════════════════════════════════════════════════════════════

## 12.1 Empty States

| Screen | Empty State Design |
|--------|-------------------|
| Operator recent scans | "No scans yet today" + subtle icon, camera still active |
| Supervisor logs (filtered) | "No records match your filter" + [Clear filters] button |
| Admin activity feed | "Waiting for activity…" + pulsing dot (live connection indicator) |
| Parent timeline | "No gate activity today" + reassuring message |
| Student history (empty month) | "No gate activity this month" |
| Gate passes (none pending) | "No pending requests" + checkmark icon |

## 12.2 Loading States

| Screen | Loading Design |
|--------|----------------|
| All data fetches | Skeleton loaders matching final layout (cards, tables, lists) |
| Operator scan verification | Spinner in scan ring + "Verifying…" (target < 500ms) |
| Admin dashboard first load | Full skeleton grid |
| Activity feed refresh | New items fade/slide in from top, no full reload |
| Export PDF | Button shows spinner + "Preparing PDF…" |

## 12.3 Error States

| Error | Design |
|-------|--------|
| Invalid QR | Red card: "Invalid ID. Please contact administration." + auto-reset 3s |
| Expired ID | Orange card: "ID expired. Please renew." + [Override] button (requires supervisor PIN) |
| Network failure (scan) | Amber: "Connection lost. Scan will be saved offline." |
| Server error (dashboard) | Full error state: icon + "Unable to load data" + [Retry] |
| Permission denied | "You don't have access to this section" + [Contact admin] |
| 404 | "Page not found" + [Back to dashboard] |

## 12.4 Success States

| Action | Success Design |
|--------|----------------|
| Scan confirmed | Full-screen green flash (1s) + tone |
| Manual entry saved | Green toast "Record saved" |
| Correction saved | Green toast "Correction saved. Audit logged." |
| Gate pass approved | Green toast + status update |
| Export complete | Green toast "PDF downloaded" |
| Settings saved | Green toast "Settings saved" |

## 12.5 Destructive Action States

| Action | Design |
|--------|--------|
| Delete record (admin) | Confirmation modal: "Delete this record? This cannot be undone." [Cancel] [Delete] (red) |
| Reject gate pass | Modal with required reason textarea |
| Logout (operator) | Hidden gesture → confirmation modal |
| Emergency lockdown | Confirmation modal: "Lockdown all gates? All gates switch to ENTRY-only." [Cancel] [LOCKDOWN] (red, 2-step) |

## 12.6 Business Logic Edge Cases

| Case | Behavior |
|------|----------|
| Duplicate scan < 5 min | "Already recorded. Duplicate scan ignored." + auto-reset |
| Last status OUT + ENTRY tapped | Direct confirm (no reason needed) |
| Last status IN + EXIT tapped | Reason selector required |
| Student not in DB | Red error + "Contact administration" |
| ID expired | Orange warning + override flow |
| Offline > 2 hours | Amber warning "Offline mode limit approaching" |
| Sync conflict | Server wins, local shows "Corrected by server" |
| Gate pass expired | Auto-closes pass, notifies student |
| Student exits without pass (Leave) | Flagged, HOD notified |
| 3+ exits in one day | Admin email alert |
| Hostel student not returned by 9 PM | Auto-alert parent + admin |
| Scanner offline > 5 min | Admin + supervisor alert |

---

# ═══════════════════════════════════════════════════════════════════════════════
# 13. IMPLEMENTATION ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════

## 13.1 Tech Stack (from Master Prompt)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables (design tokens) |
| UI Components | shadcn/ui (customized) |
| Animation | Framer Motion (scan success, overlays) |
| State | Zustand (local) + Server State (React Query/TanStack Query) |
| Real-time | WebSockets (Socket.io or native) |
| Database | PostgreSQL |
| Camera/QR | html5-qrcode or @zxing/browser |
| Charts | Recharts (admin) |
| PDF Export | react-to-print / jsPDF |
| Notifications | Firebase Cloud Messaging (push) + Twilio (SMS) |
| Auth | NextAuth.js + RBAC middleware |

## 13.2 Project Structure

```
gate-monitor/
├── app/
│   ├── (operator)/
│   │   └── gate/
│   │       └── [gateId]/
│   │           └── page.tsx          # Operator scanner
│   ├── (supervisor)/
│   │   └── supervisor/
│   │       ├── live/page.tsx
│   │       ├── logs/page.tsx
│   │       ├── corrections/page.tsx
│   │       └── passes/page.tsx
│   ├── (admin)/
│   │   └── admin/
│   │       ├── dashboard/page.tsx
│   │       ├── attendance/page.tsx
│   │       ├── students/page.tsx
│   │       ├── reports/page.tsx
│   │       ├── alerts/page.tsx
│   │       └── settings/page.tsx
│   ├── (parent)/
│   │   └── parent/
│   │       ├── child/page.tsx
│   │       ├── passes/page.tsx
│   │       └── settings/page.tsx
│   ├── (student)/
│   │   └── student/
│   │       ├── id/page.tsx
│   │       ├── history/page.tsx
│   │       └── passes/page.tsx
│   ├── login/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── operator/              # Operator-specific
│   │   ├── ScanViewfinder.tsx
│   │   ├── ScanReticle.tsx
│   │   ├── ScanConfirmation.tsx
│   │   ├── ExitReasonSelector.tsx
│   │   ├── SuccessFlash.tsx
│   │   ├── LastScanCard.tsx
│   │   ├── OperatorStats.tsx
│   │   └── ManualEntry.tsx
│   ├── supervisor/
│   ├── admin/
│   │   ├── KpiCard.tsx
│   │   ├── CampusMap.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── DeptBreakdown.tsx
│   │   ├── AlertsPanel.tsx
│   │   └── GatePassTable.tsx
│   ├── parent/
│   ├── student/
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── EmptyState.tsx
│       ├── Skeleton.tsx
│       └── Toast.tsx
├── lib/
│   ├── tokens.ts              # Design tokens
│   ├── utils.ts
│   ├── api.ts
│   ├── websocket.ts
│   └── qr.ts
├── stores/
│   ├── operatorStore.ts       # Zustand
│   ├── adminStore.ts
│   └── uiStore.ts
├── hooks/
│   ├── useScan.ts
│   ├── useLiveFeed.ts
│   └── useOfflineQueue.ts
├── types/
│   ├── roles.ts
│   ├── scan.ts
│   ├── student.ts
│   └── gate.ts
└── styles/
    ├── globals.css
    └── tokens.css
```

## 13.3 Design Token Implementation (CSS Variables)

```css
:root {
  /* Typography */
  --font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  /* Dark theme (default for operator/supervisor/admin) */
  --bg-base: #0F172A;
  --bg-surface: #1E293B;
  --bg-elevated: #334155;
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --border: #334155;
  --border-strong: #475569;
  --action-primary: #10B981;
  --action-danger: #EF4444;
  --action-warning: #F59E0B;
  --action-info: #3B82F6;
  --focus-ring: #38BDF8;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Motion */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-success: 1000ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme='light'] {
  --bg-base: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-elevated: #FFFFFF;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --border: #E2E8F0;
  --border-strong: #CBD5E1;
  --action-primary: #059669;
  --action-danger: #DC2626;
  --action-warning: #D97706;
  --action-info: #2563EB;
}
```

## 13.4 Performance Budgets

| Metric | Target |
|--------|--------|
| Scan → identification | < 500ms |
| Operator screen initial load | < 2s on tablet |
| Admin dashboard initial load | < 3s |
| Activity feed refresh | 5s (WebSocket) |
| QR code open (student) | < 1s |
| Bundle size (operator route) | < 150KB gzipped |
| Image loading | Lazy + responsive srcset |
| Font loading | `font-display: swap`, preload Inter |

## 13.5 Offline Architecture
- Operator: IndexedDB queue (Zustand persist middleware)
- Queue limit: 2 hours of scans
- Sync: background on reconnect, batch POST
- Conflict: server timestamp wins, local shows correction notice
- UI: persistent amber pill "Offline — N scans queued"

---

# ═══════════════════════════════════════════════════════════════════════════════
# 14. FINAL DESIGN CRITIQUE (Self-Review)
# ═══════════════════════════════════════════════════════════════════════════════

## 14.1 Checklist Review

| Check | Status | Notes |
|-------|--------|-------|
| Typography hierarchy | ✅ | 7 levels, strict scale, operator uses larger sizes |
| Spacing consistency | ✅ | 4/8/12/16/24/32/48/64/96/128 only |
| Alignment | ✅ | Grid-based, no arbitrary positioning |
| Color consistency | ✅ | Semantic tokens, max 3 accents per surface |
| Contrast | ✅ | All AA, most AAA |
| Component consistency | ✅ | Shared primitives, operator variants |
| Responsive behavior | ✅ | Per-surface breakpoints, mobile-first for parent/student |
| Accessibility | ✅ | Keyboard, SR, reduced-motion, color-independent |
| Loading states | ✅ | Skeletons everywhere |
| Empty states | ✅ | Designed for all major screens |
| Error states | ✅ | Invalid QR, expired ID, network, server |
| Success states | ✅ | Green flash, toasts |
| Interaction states | ✅ | Full state matrix |
| Navigation clarity | ✅ | Role-based, minimal per role |
| Mobile usability | ✅ | 44px targets, bottom nav |
| Performance | ✅ | Budgets defined, offline queue |
| Visual balance | ✅ | Intentional whitespace, no clutter |
| Cognitive load | ✅ | Operator = zero load, admin = dense but organized |

## 14.2 Weakest 20% — Improvement Plan

### Weakness 1: Admin Dashboard Density Risk
**Issue:** 6 sections on one screen risks overwhelming.
**Fix:** Progressive disclosure — sections 2–6 collapse into accordion groups with "expand" defaults (KPIs + Map always visible). Add view customization (drag to reorder, save layout).

### Weakness 2: Operator Manual Entry Friction
**Issue:** PIN + numeric keypad + search is multi-step for a low-tech user.
**Fix:** Simplify to: tap Manual Entry → keypad → roll number → auto-search on 10th digit → student card appears → confirm. PIN only required at final confirm step, not at entry.

### Weakness 3: Parent Notification Anxiety
**Issue:** "LEFT campus" notification may alarm parents.
**Fix:** Add context: "Reason: Home Out — Expected return: Tomorrow 8:00 AM". Include "View on map" (optional geo) and "Call college" quick action.

### Weakness 4: Scan Confirmation Speed
**Issue:** 2s photo lock + direction select + reason select = ~5s per scan. At rush hour (300 students/30 min = 10/min), this is tight.
**Fix:** Smart defaults — if last status is OUT, pre-highlight ENTRY button. If last status is IN, pre-highlight EXIT. Guard just taps once. Reason selector only for non-regular exits. Target: 3s per scan.

## 14.3 Final Verdict

The design achieves:
- **Apple-level clarity** — Operator screen is a purpose-built device
- **Stripe-level product design** — Clean, semantic, trustworthy
- **Linear-level interaction quality** — Scan feedback is physical and satisfying
- **Vercel-level visual discipline** — Strict tokens, no decoration
- **Figma-level design-system thinking** — One system, four surfaces, consistent semantics

The product's identity comes from:
- The **Scan Ring** reticle
- The **direction color language** (green/red/orange/blue)
- The **photo verification lock** (visible security)
- The **success flash** (physical feedback)
- The **pulse dot** campus map (live awareness)

This is not a generic template. It is a system designed specifically for a college gate — where speed, clarity, and trust are the only things that matter.

---

# ═══════════════════════════════════════════════════════════════════════════════
# APPENDIX A — SCREEN INVENTORY SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

| # | Screen | Role | Device | Theme | Complexity |
|---|--------|------|--------|-------|------------|
| 1 | Gate Operator Scanner | Operator | Tablet landscape | Dark | LOW |
| 2 | Scan Confirmation Overlay | Operator | Tablet | Dark | LOW |
| 3 | Exit Reason Selector | Operator | Tablet | Dark | LOW |
| 4 | Manual Entry | Operator | Tablet | Dark | LOW |
| 5 | Supervisor — Live Gate | Supervisor | Tablet/Desktop | Dark | MEDIUM |
| 6 | Supervisor — Today's Logs | Supervisor | Tablet/Desktop | Dark | MEDIUM |
| 7 | Supervisor — Corrections | Supervisor | Tablet/Desktop | Dark | MEDIUM |
| 8 | Supervisor — Gate Passes | Supervisor | Tablet/Desktop | Dark | MEDIUM |
| 9 | Admin Dashboard | Admin | Desktop | Dark | HIGH |
| 10 | Admin — Attendance | Admin | Desktop | Dark | HIGH |
| 11 | Admin — Students | Admin | Desktop | Dark | HIGH |
| 12 | Admin — Reports | Admin | Desktop | Dark | HIGH |
| 13 | Admin — Alerts | Admin | Desktop | Dark | MEDIUM |
| 14 | Admin — Settings | Admin | Desktop | Dark | MEDIUM |
| 15 | SysAdmin — Users & Roles | SysAdmin | Desktop | Dark | MEDIUM |
| 16 | SysAdmin — Gates & Devices | SysAdmin | Desktop | Dark | MEDIUM |
| 17 | SysAdmin — API Keys | SysAdmin | Desktop | Dark | LOW |
| 18 | SysAdmin — Backups | SysAdmin | Desktop | Dark | LOW |
| 19 | Parent — Child Status | Parent | Mobile | Light | LOW |
| 20 | Parent — Gate Pass Approvals | Parent | Mobile | Light | LOW |
| 21 | Parent — Settings | Parent | Mobile | Light | LOW |
| 22 | Student — Digital ID | Student | Mobile | Light | LOW |
| 23 | Student — Gate History | Student | Mobile | Light | MEDIUM |
| 24 | Student — Request Pass | Student | Mobile | Light | LOW |
| 25 | Login | All | All | Dark | LOW |

---

# ═══════════════════════════════════════════════════════════════════════════════
# APPENDIX B — IMPLEMENTATION ORDER (Phased)
# ═══════════════════════════════════════════════════════════════════════════════

## Phase 1 — Foundation (Week 1)
- [ ] Design tokens (CSS variables)
- [ ] shadcn/ui setup + customization
- [ ] Auth + RBAC middleware
- [ ] Database schema (students, gates, scans, passes, users)
- [ ] Login screen

## Phase 2 — Gate Operator (Week 2) — HIGHEST PRIORITY
- [ ] Operator scanner screen (camera, reticle)
- [ ] Scan confirmation overlay + photo lock
- [ ] Exit reason selector
- [ ] Success flash animation
- [ ] Manual entry flow
- [ ] Offline queue
- [ ] Last scan card + stats + recent 5

## Phase 3 — Supervisor (Week 3)
- [ ] Live Gate tab
- [ ] Today's Logs (table, search, filter, export)
- [ ] Corrections (audit trail)
- [ ] Gate Passes (approve/reject)

## Phase 4 — Admin Dashboard (Week 4)
- [ ] KPI cards
- [ ] Live campus map (SVG)
- [ ] Activity feed (WebSocket)
- [ ] Department breakdown (charts)
- [ ] Alerts panel
- [ ] Gate pass management table

## Phase 5 — Parent & Student Apps (Week 5)
- [ ] Parent: child status, timeline, weekly chart, pass approvals
- [ ] Student: digital ID QR, history calendar, pass request
- [ ] Push notifications (FCM)
- [ ] SMS (Twilio)

## Phase 6 — SysAdmin + Polish (Week 6)
- [ ] Users & roles management
- [ ] Gates & devices configuration
- [ ] API keys, backups
- [ ] Performance audit
- [ ] Accessibility audit
- [ ] Edge case testing
- [ ] Load testing (1,500 students × 2 scans/day)

---

*End of UI/UX Plan — Student Gate Monitoring System*
*Prepared using the World-Class Product Designer Master Prompt standard.*
````

## File: .repomixignore
````
# Add patterns to ignore here, one per line
# Example:
# *.log
# tmp/
````

## File: package.json
````json
{
  "devDependencies": {
    "repomix": "^1.18.0"
  }
}
````

## File: repomix.config.json
````json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 52428800
  },
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown",
    "filePathStyle": "target-relative",
    "parsableStyle": false,
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "compress": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeFullDirectoryStructure": false,
    "tokenCountTree": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": [],
  "ignore": {
    "useGitignore": true,
    "useDotIgnore": true,
    "useDefaultPatterns": true,
    "customPatterns": []
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
````
