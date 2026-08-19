#let source = json(__RESUME_DATA_PATH__)

#let dark = rgb("#0d0d0d")
#let blue = rgb("#1481ab")
#let cyan = rgb("#1cade4")
#let sidebar-blue = rgb("#c9daf8")
#let muted = rgb("#667085")

#let with-default(value, fallback) = if value == none { fallback } else { value }
#let text-of(value) = with-default(value, "")
#let list-of(value) = with-default(value, ())
#let text-of-item(item, key) = text-of(item.at(key, default: ""))
#let section-titles = with-default(source.at("sectionTitles", default: (:)), (:))
#let section-title(key, fallback) = text-of(section-titles.at(key, default: fallback))

#let markup-text(value) = {
  if type(value) == str and value != "" {
    eval(value, mode: "markup")
  } else {
    []
  }
}

#let linked-label(label, url) = {
  if url == "" {
    label
  } else {
    link(url)[#label]
  }
}

#let bullets-of(entry) = {
  list-of(entry.at("bullets", default: ()))
    .map(value => text-of(value))
    .filter(value => value != "")
    .map(value => markup-text(value))
}

#let custom-sections = list-of(source.at("customSections", default: ()))
#let custom-section-layout = with-default(
  source.at("customSectionLayout", default: (:)),
  (:),
)
#let custom-section-by-id(id) = {
  let matches = custom-sections.filter(
    section => text-of-item(section, "id") == id,
  )
  if matches.len() > 0 { matches.at(0) } else { none }
}
#let custom-sections-in-order(ids) = {
  let ordered = ()
  for id in list-of(ids) {
    let section = custom-section-by-id(text-of(id))
    if section != none {
      ordered.push(section)
    }
  }
  ordered
}
#let sidebar-custom-sections = custom-sections-in-order(
  custom-section-layout.at("sidebar", default: ()),
)
#let main-custom-sections = custom-sections-in-order(
  custom-section-layout.at("main", default: ()),
)
#let continuation-custom-sections = custom-sections-in-order(
  custom-section-layout.at("continuation", default: ()),
)

#let section-heading(title) = [
  #v(9pt)
  #text(font: "Arial", size: 11pt, weight: "medium", fill: dark)[#upper(title)]
  #v(2pt)
  #line(length: 100%, stroke: .7pt + blue)
  #v(5pt)
]

#let compact-heading(title) = [
  #v(10pt)
  #text(font: "Arial", size: 11pt, weight: "bold", fill: dark)[#title]
  #v(3pt)
]

#let bullet-list(items, compact: false, hanging: false) = {
  if items.len() > 0 {
    set list(
      marker: [#circle(radius: 1.35pt, fill: if compact { dark } else { blue })],
      indent: if hanging { 0pt } else if compact { 9pt } else { 10pt },
      body-indent: if hanging { 9.5pt } else { 5pt },
      spacing: if compact { 6pt } else { 2.5pt },
      tight: false,
    )
    for item in items {
      [- #item]
    }
  }
}

#let custom-section-body(section, compact: false) = {
  if section != none {
    for item in list-of(section.at("items", default: ())) {
      let text = text-of-item(item, "text")
      if text != "" [
        #markup-text(text)
        #v(if compact { 2pt } else { 3pt })
      ]
      if compact {
        v(-6pt)
      }
      bullet-list(
        list-of(item.at("bullets", default: ()))
          .map(value => text-of(value))
          .filter(value => value != "")
          .map(value => markup-text(value)),
        compact: compact,
        hanging: compact,
      )
    }
  }
}

#let experience-entry(entry, highlights: none, continued: false) = {
  let role = text-of-item(entry, "subtitle")
  let company = text-of-item(entry, "title")
  let date = text-of-item(entry, "date")
  let location = text-of-item(entry, "secondarySubtitle")
  let url = text-of-item(entry, "url")
  let items = if highlights == none { bullets-of(entry) } else { highlights }

  block(breakable: false)[
    #grid(
      columns: (1fr, auto),
      column-gutter: 8pt,
      [
        #text(font: "Arial", size: 10.5pt, weight: "bold", fill: blue)[
          #if role != "" { role } else { linked-label(company, url) }
          #if continued { [ (continued)] }
        ]
      ],
      [#text(font: "Arial", size: 8.3pt, fill: muted)[#date]],
    )
    #if role != "" and company != "" [
      #text(font: "Arial", size: 8.8pt, fill: muted)[
        #linked-label(company, url)
        #if location != "" { [ | #location] }
      ]
    ]
    #v(2pt)
    #bullet-list(items)
  ]
  v(6pt)
}

#let timeline-entry(entry) = {
  let title = text-of-item(entry, "title")
  let subtitle = text-of-item(entry, "subtitle")
  let date = text-of-item(entry, "date")
  let url = text-of-item(entry, "url")
  block(breakable: false)[
    #grid(
      columns: (1fr, auto),
      column-gutter: 8pt,
      [#text(font: "Arial", size: 9.5pt, weight: "bold", fill: blue)[#linked-label(title, url)]],
      [#text(font: "Arial", size: 8pt, fill: muted)[#date]],
    )
    #if subtitle != "" [
      #text(font: "Arial", size: 8.7pt, fill: muted)[#subtitle]
    ]
    #v(2pt)
    #bullet-list(bullets-of(entry), compact: true)
  ]
  v(5pt)
}

#let contact-items = list-of(source.at("contactItems", default: ()))
#let profile-items = list-of(source.at("profileItems", default: ()))
#let custom-field-items = list-of(source.at("customFieldItems", default: ()))

#let contact-line(item) = {
  let label = text-of-item(item, "text")
  let url = text-of-item(item, "url")
  if label != "" {
    [#linked-label(label, url)]
  }
}

#let sidebar-section(title, body) = [
  #compact-heading(title)
  #set text(font: "Arial", size: 10pt, fill: dark)
  #set par(leading: .2em)
  #body
]

#let name-parts = text-of(source.at("name", default: "")).split(" ")
#let first-name = if name-parts.len() > 0 { name-parts.at(0) } else { "" }
#let last-name = if name-parts.len() > 1 { name-parts.slice(1).join(" ") } else { "" }
#let picture = with-default(source.at("picture", default: (:)), (:))
#let picture-path = text-of(picture.at("renderPath", default: ""))
#let picture-hidden = with-default(picture.at("hidden", default: true), true)
#let picture-size = with-default(picture.at("size", default: 80), 80)
#let experience = list-of(source.at("experience", default: ()))
#let education = list-of(source.at("education", default: ()))
#let skill-groups = list-of(source.at("skillGroups", default: ()))
#let languages = list-of(source.at("languages", default: ()))
#let certifications = list-of(source.at("certifications", default: ()))
#let later-certifications = certifications
#let first-page-main-width = 124mm
#let first-page-content-height = 277mm

#let first-page-intro = [
  #text(font: "Arial", size: 29pt, weight: "medium", fill: cyan)[#first-name]
  #linebreak()
  #text(font: "Arial", size: 29pt, weight: "medium", fill: blue)[#last-name]
  #v(8pt)
  #text(font: "Arial", size: 8.5pt, fill: dark)[
    #text-of(source.at("headline", default: ""))
  ]

  #if text-of(source.at("summary", default: "")) != "" [
    #section-heading(section-title("summary", "Professional Summary"))
    #text(size: 8.7pt)[#markup-text(text-of(source.at("summary", default: "")))]
  ]

  #for section in main-custom-sections [
    #section-heading(text-of-item(section, "title"))
    #custom-section-body(section)
  ]
]

#let first-page-main(selected) = [
  #first-page-intro
  #if selected.len() > 0 [
    #section-heading(section-title("experience", "Experience"))
    #for selected-entry in selected {
      let entry = selected-entry.at("entry")
      let visible-count = selected-entry.at("count")
      experience-entry(
        entry,
        highlights: bullets-of(entry).slice(0, visible-count),
      )
    }
  ]
]

#let first-page-height(selected) = measure(
  block(width: first-page-main-width)[#first-page-main(selected)],
).height

#let select-first-page-experience(entries) = {
  let selected = ()

  for entry in entries {
    let highlights = bullets-of(entry)
    let minimum-count = if highlights.len() > 0 { 1 } else { 0 }
    let candidate = selected + ((entry: entry, count: minimum-count),)

    if first-page-height(candidate) > first-page-content-height {
      break
    }

    selected = candidate
    let visible-count = minimum-count

    for count in range(minimum-count + 1, highlights.len() + 1) {
      candidate = selected.slice(0, selected.len() - 1) + ((
        entry: entry,
        count: count,
      ),)

      if first-page-height(candidate) > first-page-content-height {
        break
      }

      selected = candidate
      visible-count = count
    }

    if visible-count < highlights.len() {
      break
    }
  }

  selected
}

#let build-experience-continuation(entries, selected) = {
  let continuation = ()

  for (index, entry) in entries.enumerate() {
    let visible-count = if index < selected.len() {
      selected.at(index).at("count")
    } else {
      0
    }
    let bullet-count = bullets-of(entry).len()

    if index >= selected.len() or visible-count < bullet-count {
      continuation.push((
        entry: entry,
        start: visible-count,
        continued: visible-count > 0,
      ))
    }
  }

  continuation
}

#set page(
  paper: "a4",
  margin: 8mm,
  footer: context [
    #align(right)[
      #text(font: "Arial", size: 7.5pt, fill: muted)[#counter(page).display()]
    ]
  ],
)
#set text(font: "Arial", size: 9pt, fill: dark, lang: "en")
#set par(leading: .52em)
#show link: set text(fill: blue)

#context [
  #let first-page-experience = select-first-page-experience(experience)
  #let continuation-experience = build-experience-continuation(
    experience,
    first-page-experience,
  )

#grid(
  columns: (2fr, 1fr),
  gutter: 0pt,
  [
    #block(height: 281mm, inset: (right: 13pt))[
      #first-page-main(first-page-experience)
    ]
  ],
  [
    #block(height: 281mm, fill: sidebar-blue, inset: (x: 6pt, y: 4pt))[
      #if picture-path != "" and picture-hidden == false [
        #align(center)[
          #image(
            picture-path,
            width: calc.min(38mm, picture-size * 1pt),
            height: 49mm,
            fit: "cover",
          )
        ]
        #v(8pt)
      ]

      #sidebar-section("Contact Information", [
        #for item in contact-items {
          contact-line(item)
          linebreak()
        }
        #for item in profile-items {
          let network = text-of-item(item, "network")
          let username = text-of-item(item, "username")
          let url = text-of-item(item, "url")
          linked-label(if network != "" { network } else { username }, url)
          linebreak()
        }
        #if text-of(source.at("location", default: "")) != "" [
          #text-of(source.at("location", default: ""))
          #linebreak()
        ]
        #for item in custom-field-items {
          contact-line(item)
          linebreak()
        }
      ])

      #if sidebar-custom-sections.len() > 0 [
        #for section in sidebar-custom-sections [
          #sidebar-section(text-of-item(section, "title"), [
            #custom-section-body(section, compact: true)
          ])
        ]
      ] else if skill-groups.len() > 0 [
        #sidebar-section("Expertise Areas", [
          #for group in skill-groups.slice(0, calc.min(3, skill-groups.len())) [
            #text(weight: "bold", fill: blue)[#text-of-item(group, "name")]
            #linebreak()
            #text(size: 7.7pt)[#list-of(group.at("keywords", default: ())).join(", ")]
            #v(4pt)
          ]
        ])
      ]

      #if education.len() > 0 [
        #sidebar-section(section-title("education", "Education"), [
          #for entry in education [
            #let degree = text-of-item(entry, "subtitle")
            #let school = text-of-item(entry, "title")
            #let date = text-of-item(entry, "date")
            #if degree != "" [
              #text(fill: dark)[#degree]
              #linebreak()
            ]
            #text(size: 10pt, fill: dark)[
              #if date != "" { date }
              #if date != "" and school != "" { [ | ] }
              #linked-label(school, text-of-item(entry, "url"))
            ]
            #v(4pt)
          ]
        ])
      ]

      #if languages.len() > 0 [
        #sidebar-section(section-title("languages", "Languages"), [
          #bullet-list(
            languages.map(item => [
              #text(weight: "bold")[#text-of-item(item, "language")]
              #if text-of-item(item, "fluency") != "" { [ – #text-of-item(item, "fluency")] }
            ]),
            compact: true,
          )
        ])
      ]
    ]
  ],
)

#pagebreak()

#if continuation-experience.len() > 0 [
  #section-heading(section-title("experience", "Experience"))
  #for continued-entry in continuation-experience {
    let entry = continued-entry.at("entry")
    experience-entry(
      entry,
      highlights: bullets-of(entry).slice(continued-entry.at("start")),
      continued: continued-entry.at("continued"),
    )
  }
]

#if skill-groups.len() > 0 [
  #section-heading(section-title("skills", "Technical Skills and Tools"))
  #grid(
    columns: (1fr, 1fr),
    column-gutter: 18pt,
    row-gutter: 8pt,
    ..skill-groups.map(group => [
      #block(breakable: false)[
        #text(font: "Arial", size: 9.5pt, weight: "bold", fill: blue)[#text-of-item(group, "name")]
        #v(2pt)
        #bullet-list(
          list-of(group.at("keywords", default: ())).map(value => text-of(value)),
          compact: true,
        )
      ]
    ]),
  )
]

#let ordered-sections = (
  ("projects", source.at("projects", default: ()), section-title("projects", "Projects")),
  ("awards", source.at("awards", default: ()), section-title("awards", "Awards")),
  ("publications", source.at("publications", default: ()), section-title("publications", "Publications")),
  ("volunteer", source.at("volunteer", default: ()), section-title("volunteer", "Volunteer")),
  ("references", source.at("references", default: ()), section-title("references", "References")),
)

#for section in ordered-sections {
  let entries = list-of(section.at(1))
  if entries.len() > 0 {
    section-heading(section.at(2))
    for entry in entries {
      timeline-entry(entry)
    }
  }
}

#if later-certifications.len() > 0 [
  #section-heading(section-title("certifications", "Certifications"))
  #for entry in later-certifications {
    timeline-entry(entry)
  }
]

#for section in continuation-custom-sections {
  section-heading(text-of-item(section, "title"))
  custom-section-body(section)
}



#let interests = list-of(source.at("interests", default: ()))
#if interests.len() > 0 [
  #section-heading(section-title("interests", "Interests"))
  #for item in interests [
    #text(weight: "bold", fill: blue)[#text-of-item(item, "name")]
    #if list-of(item.at("keywords", default: ())).len() > 0 [
      #h(5pt)
      #list-of(item.at("keywords", default: ())).join(", ")
    ]
    #linebreak()
  ]
]
]
