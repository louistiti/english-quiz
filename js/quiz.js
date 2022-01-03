window.addEventListener('DOMContentLoaded', async () => {
  const formWrapper = document.querySelector('#form-wrapper')
  const friendlyMessageWrapper = document.querySelector('#friendly-message-wrapper')
  const quizWrapper = document.querySelector('#quiz-wrapper')
  const summaryWrapper = document.querySelector('#summary-wrapper')
  const form = document.querySelector('#form-wrapper form')
  const friendlyMsgBtn = document.querySelector('#friendly-message-wrapper button')
  const correctBtn = document.querySelector('#correct-btn')
  const skipBtn = document.querySelector('#skip-btn')
  const audioPlayer = document.querySelector('#audio')
  const enEntity = document.querySelector('#en-entity')
  const zhEntity = document.querySelector('#zh-entity')
  const qrCodeImg = document.querySelector('#qr-code')
  const formLsKey = 'form'
  const wrapperStateLsKey = 'wrapperState'
  const levelLsKey = 'level'
  const scoreLsKey = 'score'
  const wrapperStateLs = localStorage.getItem(wrapperStateLsKey)
  const wrapperMap = {
    form: 0,
    friendlyMessage: 1,
    quiz: 2,
    summary: 3
  }
  const gradeMap = {
    A0: [0, 1],
    A1: [2, 3],
    A2: [4, 5],
    A3: [6],
    B1: [],
    B2: [],
    B3: []
  }
  const formElements = []
  let formData = { }
  let currentLevel = 'A0'
  let currentEntities = []
  let currentLevelSkipNb = 0
  let score = 0
  let entity = { }

  const nextLevel = () => {
    currentLevelSkipNb = 0
    const keys = Object.keys(gradeMap)
    const nextIndex = keys.indexOf(currentLevel) + 1
    const nextLevel = keys[nextIndex]

    setLevel(nextLevel)
    loadEntities()
    pickEntity()
  }
  const previousLevel = () => {
    currentLevelSkipNb = 0
    const keys = Object.keys(gradeMap)
    const previousIndex = keys.indexOf(currentLevel) - 1
    const previousLevel = currentLevel === 'A0' ? currentLevel : keys[previousIndex]

    setLevel(previousLevel)
    loadEntities()
    pickEntity()
  }
  const pickEntity = () => {
    // There is no entity left for the current level
    if (currentEntities.length === 0) {
      if (currentLevel === 'B3') {
        setWrapperState(wrapperMap.summary)
      } else {
        nextLevel()
      }
    } else {
      const index = Math.floor(Math.random() * currentEntities.length)
      entity = currentEntities[index]

      currentEntities.splice(index, 1)

      audioPlayer.src = `audio/${entity.audio}`
      audioPlayer.load()

      enEntity.innerHTML = entity.en
      zhEntity.innerHTML = entity.zh
    }
  }
  const req = await fetch('levels.json')
  const { levels } = await req.json()

  const runForm = () => {
    const tags = ['input', 'select']

    form.childNodes.forEach((el) => {
      if (el?.classList?.contains('form-element')) {
        el.childNodes.forEach((el2) => {
          const tag = el2.tagName?.toLowerCase()

          if (tags.includes(tag)) {
            formElements.push(el2)
          }
        })
      }
    })
  }
  const runQuiz = () => {
    const grade = Number(formData.grade)
    const lsLevel = localStorage.getItem(levelLsKey)

    if (lsLevel) {
      setLevel(lsLevel)
    } else {
      Object.keys(gradeMap).forEach((key) => {
        if (gradeMap[key].includes(grade)) {
          setLevel(key)
        }
      })
    }

    loadEntities()
    pickEntity()
  }
  const runSummmary = () => {
    const tmpScore = localStorage.getItem(scoreLsKey)

    if (tmpScore) {
      score = tmpScore
    }
    localStorage.setItem(scoreLsKey, score)

    const resultObj = {
      score,
      level: currentLevel,
      form: formData
    }
    const base64Result = btoa(JSON.stringify(resultObj))

    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${base64Result}`
  }
  const wrapperRunMap = {
    [wrapperMap.form]: runForm,
    [wrapperMap.friendlyMessage]: () => { },
    [wrapperMap.quiz]: runQuiz,
    [wrapperMap.summary]: runSummmary
  }
  const wrappers = [
    { id: wrapperMap.form, el: formWrapper },
    { id: wrapperMap.friendlyMessage, el: friendlyMessageWrapper },
    { id: wrapperMap.quiz, el: quizWrapper },
    { id: wrapperMap.summary, el: summaryWrapper }
  ]
  let currentWrapperState = wrapperMap.form

  const setLevel = (newLevel) => {
    localStorage.setItem(levelLsKey, newLevel)
    currentLevel = newLevel
  }
  const setWrapperState = (newState) => {
    if (newState !== wrapperStateLs) {
      localStorage.setItem(wrapperStateLsKey, newState)
    }

    wrappers.forEach((wrapper) => {
      if (Number(newState) === wrapper.id) {
        currentWrapperState = wrapper.id
        wrapperRunMap[currentWrapperState]()

        wrapper.el.classList.remove('hidden-wrapper')
      } else {
        wrapper.el.classList.add('hidden-wrapper')
      }
    })
  }
  const loadEntities = () => {
    levels.forEach((level) => {
      if (level.name === currentLevel) {
        currentEntities = level.entities
      }
    })
  }
  const loadFormData = () => {
    const rawFormData = localStorage.getItem(formLsKey)

    formData = rawFormData ? JSON.parse(rawFormData) : { }
  }

  const init = () => {
    loadFormData()

    if (wrapperStateLs) {
      setWrapperState(wrapperStateLs)
    } else {
      setWrapperState(wrapperMap.form)
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault()

      const valuesObj = { }
      formElements.forEach((el) => {
        valuesObj[el.id] = el.value
      })

      localStorage.setItem(formLsKey, JSON.stringify(valuesObj))
      setWrapperState(wrapperMap.friendlyMessage)
      loadFormData()
    })
    friendlyMsgBtn.addEventListener('click', (e) => {
      e.preventDefault()

      setWrapperState(wrapperMap.quiz)
    })
    correctBtn.addEventListener('click', (e) => {
      e.preventDefault()

      score += 1
      pickEntity()
    })
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault()

      if (entity.type === 'sentence') {
        score -= 0.5
      }
      pickEntity()
      currentLevelSkipNb += 1
      if (currentLevelSkipNb === 5) {
        previousLevel()
        setWrapperState(wrapperMap.summary)
      }
    })
  }

  init()
})
