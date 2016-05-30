'use strict';

(function() {
  /**
   * @param {Canvas2DRenderingContext} context
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number} maxWidth
   * @param {number} lineHeight
   */
  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    var cars = text.split("\n");
    
    for (var ii = 0; ii < cars.length; ii++) {
      var line = "";
      var words = cars[ii].split(" ");
      
      for (var n = 0; n < words.length; n++) {
        var testLine = line + words[n] + " ";
        var metrics = context.measureText(testLine);
        var testWidth = metrics.width;
        
        if (testWidth > maxWidth) {
          context.fillText(line, x, y);
          line = words[n] + " ";
          y += lineHeight;
        }
        else {
          line = testLine;
        }
      }
      
      context.fillText(line, x, y);
      y += lineHeight;
    }
  }

  /**
   * @param {number} deltaX
   * @param {number} deltaY
   * @param {Canvas2DRenderingContext} ctx 
   */  
  function shape(deltaX, deltaY, ctx) {
    ctx.moveTo(deltaX + WIDTH * 0.3, deltaY + HEIGHT * 0.3);
    ctx.lineTo(deltaX + WIDTH * 0.8, deltaY + HEIGHT * 0.3 - 10);
    ctx.lineTo(deltaX + WIDTH * 0.8 - 30, deltaY + HEIGHT * 0.7);
    ctx.lineTo(deltaX + WIDTH * 0.3 - 30, deltaY + HEIGHT * 0.7 + 30);
    ctx.lineTo(deltaX + WIDTH * 0.3 + 4, deltaY + HEIGHT * 0.3 - 4);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * @return {string}
   */
  function checkFn() {
    if (typeof window.getMessage === 'function') {
      return window.getMessage.apply(null, arguments);
    }

    return 'Не найдена функция getMessage, которая должна быть объявлена ' +
        'в глобальной области видимости в файле check.js';
  }

  /**
   * @const
   * @type {number}
   */
  var HEIGHT = 300;

  /**
   * @const
   * @type {number}
   */
  var WIDTH = 700;

  /**
   * ID уровней.
   * @enum {number}
   */
  var Level = {
    'INTRO': 0
  };

  /**
   * Порядок прохождения уровней.
   * @type {Array.<Level>}
   */
  var LevelSequence = [
    Level.INTRO
  ];

  /**
   * Начальный уровень.
   * @type {Level}
   */
  var INITIAL_LEVEL = LevelSequence[0];

  /**
   * Допустимые виды объектов на карте.
   * @enum {number}
   */
  var ObjectType = {
    'ME': 0,
    'FIREBALL': 1
  };

  /**
   * Допустимые состояния объектов.
   * @enum {number}
   */
  var ObjectState = {
    'OK': 0,
    'DISPOSED': 1
  };

  /**
   * Коды направлений.
   * @enum {number}
   */
  var Direction = {
    NULL: 0,
    LEFT: 1,
    RIGHT: 2,
    UP: 4,
    DOWN: 8
  };

  /**
   * Правила перерисовки объектов в зависимости от состояния игры.
   * @type {Object.<ObjectType, function(Object, Object, number): Object>}
   */
  var ObjectsBehaviour = {};

  /**
   * Обновление движения мага. Движение мага зависит от нажатых в данный момент
   * стрелок. Маг может двигаться одновременно по горизонтали и по вертикали.
   * На движение мага влияет его пересечение с препятствиями.
   * @param {Object} object
   * @param {Object} state
   * @param {number} timeframe
   */
  ObjectsBehaviour[ObjectType.ME] = function(object, state, timeframe) {
    // Пока зажата стрелка вверх, маг сначала поднимается, а потом левитирует
    // в воздухе на определенной высоте.
    // NB! Сложность заключается в том, что поведение описано в координатах
    // канваса, а не координатах, относительно нижней границы игры.
    if (state.keysPressed.UP && object.y > 0) {
      object.direction = object.direction & ~Direction.DOWN;
      object.direction = object.direction | Direction.UP;
      object.y -= object.speed * timeframe * 2;

      if (object.y < 0) {
        object.y = 0;
      }
    }

    // Если стрелка вверх не зажата, а маг находится в воздухе, он плавно
    // опускается на землю.
    if (!state.keysPressed.UP) {
      if (object.y < HEIGHT - object.height) {
        object.direction = object.direction & ~Direction.UP;
        object.direction = object.direction | Direction.DOWN;
        object.y += object.speed * timeframe / 3;
      } else {
        object.direction = object.direction & ~Direction.DOWN;
      }
    }

    // Если зажата стрелка влево, маг перемещается влево.
    if (state.keysPressed.LEFT) {
      object.direction = object.direction & ~Direction.RIGHT;
      object.direction = object.direction | Direction.LEFT;
      object.x -= object.speed * timeframe;
    }

    // Если зажата стрелка вправо, маг перемещается вправо.
    if (state.keysPressed.RIGHT) {
      object.direction = object.direction & ~Direction.LEFT;
      object.direction = object.direction | Direction.RIGHT;
      object.x += object.speed * timeframe;
    }

    // Ограничения по перемещению по полю. Маг не может выйти за пределы поля.
    if (object.y < 0) {
      object.y = 0;
      object.Direction = object.direction & ~Direction.DOWN;
      object.Direction = object.direction & ~Direction.UP;
    }

    if (object.y > HEIGHT - object.height) {
      object.y = HEIGHT - object.height;
      object.Direction = object.direction & ~Direction.DOWN;
      object.Direction = object.direction & ~Direction.UP;
    }

    if (object.x < 0) {
      object.x = 0;
    }

    if (object.x > WIDTH - object.width) {
      object.x = WIDTH - object.width;
    }
  };

  /**
   * Обновление движения файрбола. Файрбол выпускается в определенном направлении
   * и после этого неуправляемо движется по прямой в заданном направлении. Если
   * он пролетает весь экран насквозь, он исчезает.
   * @param {Object} object
   * @param {Object} state
   * @param {number} timeframe
   */
  ObjectsBehaviour[ObjectType.FIREBALL] = function(object, state, timeframe) {
    if (object.direction & Direction.LEFT) {
      object.x -= object.speed * timeframe;
    }

    if (object.direction & Direction.RIGHT) {
      object.x += object.speed * timeframe;
    }

    if (object.x < 0 || object.x > WIDTH) {
      object.state = ObjectState.DISPOSED;
    }
  };

  /**
   * ID возможных ответов функций, проверяющих успех прохождения уровня.
   * CONTINUE говорит о том, что раунд не закончен и игру нужно продолжать,
   * WIN о том, что раунд выигран, FAIL — о поражении. PAUSE о том, что игру
   * нужно прервать.
   * @enum {number}
   */
  var Verdict = {
    'CONTINUE': 0,
    'WIN': 1,
    'FAIL': 2,
    'PAUSE': 3,
    'INTRO': 4
  };

  /**
   * Правила завершения уровня. Ключами служат ID уровней, значениями функции
   * принимающие на вход состояние уровня и возвращающие true, если раунд
   * можно завершать или false если нет.
   * @type {Object.<Level, function(Object):boolean>}
   */
  var LevelsRules = {};

  /**
   * Уровень считается пройденным, если был выпущен файлболл и он улетел
   * за экран.
   * @param {Object} state
   * @return {Verdict}
   */
  LevelsRules[Level.INTRO] = function(/*state*/) {
    return Verdict.CONTINUE;
  };

  /**
   * Начальные условия для уровней.
   * @enum {Object.<Level, function>}
   */
  var LevelsInitialize = {};

  /**
   * Первый уровень.
   * @param {Object} state
   * @return {Object}
   */
  LevelsInitialize[Level.INTRO] = function(state) {
    state.objects.push(
      // Установка персонажа в начальное положение. Он стоит в крайнем левом
      // углу экрана, глядя вправо. Скорость перемещения персонажа на этом
      // уровне равна 2px за кадр.
      {
        direction: Direction.RIGHT,
        height: 84,
        speed: 2,
        sprite: 'img/wizard.gif',
        spriteReversed: 'img/wizard-reversed.gif',
        state: ObjectState.OK,
        type: ObjectType.ME,
        width: 61,
        x: WIDTH / 2,
        y: HEIGHT - 100
      }
    );

    return state;
  };

  /**
   * Конструктор объекта Game. Создает canvas, добавляет обработчики событий
   * и показывает приветственный экран.
   * @param {Element} container
   * @constructor
   */
  var Game = function(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._pauseListener = this._pauseListener.bind(this);
  };

  Game.prototype = {
    /**
     * Текущий уровень игры.
     * @type {Level}
     */
    level: INITIAL_LEVEL,

    /**
     * Состояние игры. Описывает местоположение всех объектов на игровой карте
     * и время проведенное на уровне и в игре.
     * @return {Object}
     */
    getInitialState: function() {
      return {
        // Статус игры. Если CONTINUE, то игра продолжается.
        currentStatus: Verdict.CONTINUE,

        // Объекты, удаленные на последнем кадре.
        garbage: [],

        // Время с момента отрисовки предыдущего кадра.
        lastUpdated: null,

        // Состояние нажатых клавиш.
        keysPressed: {
          ESC: false,
          LEFT: false,
          RIGHT: false,
          SPACE: false,
          UP: false
        },

        // Время начала прохождения уровня.
        levelStartTime: null,

        // Все объекты на карте.
        objects: [],

        // Время начала прохождения игры.
        startTime: null,

        // Сообщение для кастомного статуса остановки игры.
        customMessage: null
      };
    },

    /**
     * Начальные проверки и запуск текущего уровня.
     * @param {Level=} level
     * @param {boolean=} restart
     */
    initializeLevelAndStart: function(level, restart) {
      level = typeof level === 'undefined' ? this.level : level;
      restart = typeof restart === 'undefined' ? true : restart;

      if (restart || !this.state) {
        // При перезапуске уровня, происходит полная перезапись состояния
        // игры из изначального состояния.
        this.state = this._getInitialLevelState(this.level);
      } else {
        // При продолжении уровня состояние сохраняется, кроме записи о том,
        // что состояние уровня изменилось с паузы на продолжение игры.
        this.state.currentStatus = Verdict.CONTINUE;
      }

      // Запись времени начала игры и времени начала уровня.
      this.state.levelStartTime = Date.now();
      if (!this.state.startTime) {
        this.state.startTime = this.state.levelStartTime;
      }

      this._preloadImagesForLevel(function() {
        // Предварительная отрисовка игрового экрана.
        this.render();

        // Установка обработчиков событий.
        this._initializeGameListeners();

        // Запуск игрового цикла.
        this.update();
      }.bind(this));
    },

    /**
     * Временная остановка игры.
     * @param {Verdict=} verdict
     */
    pauseLevel: function(verdict) {
      if (verdict) {
        this.state.currentStatus = verdict;
      }

      this.state.keysPressed.ESC = false;
      this.state.lastUpdated = null;

      this._removeGameListeners();
      window.addEventListener('keydown', this._pauseListener);

      this._drawPauseScreen();
    },

    /**
     * Обработчик событий клавиатуры во время паузы.
     * @param {KeyboardsEvent} evt
     * @private
     * @private
     */
    _pauseListener: function(evt) {
      if (evt.keyCode === 32) {
        evt.preventDefault();
        var needToRestartTheGame = (
            this.state.currentStatus === Verdict.WIN ||
            this.state.currentStatus === Verdict.FAIL);
        this.initializeLevelAndStart(this.level, needToRestartTheGame);

        window.removeEventListener('keydown', this._pauseListener);
      }
    },
    
    /**
     * @param {string} message
     * @param {boolean} isError
     */
    _drawMessage: function(message, isError) {
      isError = !!isError;
      
      if (!isError) {
        this.ctx.strokeStyle = '#0066ff';
      } else {
        this.ctx.strokeStyle = 'red';
      }

      this.ctx.lineWidth = 10;
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px PT Mono';

      shape(0, 0, this.ctx);
      this.ctx.fillStyle = 'black';
      
      var topText = HEIGHT * 0.3 + 30;
      if (!isError) {
        topText += 30;
      }

      wrapText(this.ctx, message, WIDTH * 0.3 + 15, topText, WIDTH * 0.75 - WIDTH * 0.3 - 10, 20);
    },

    /**
     * Отрисовка экрана паузы.
     */
    _drawPauseScreen: function() {
      switch (this.state.currentStatus) {
        case Verdict.WIN:
          this._drawMessage(this.state.customMessage + '. Пробел для рестарта.' || 'you have won!');
          break;
        case Verdict.FAIL:
          this._drawMessage(this.state.customMessage + '. Пробел для рестарта.' || 'you have failed!', true);
          break;
        case Verdict.PAUSE:
          this._drawMessage('Пауза. Нажмите пробел для продолжения игры');
          break;
        case Verdict.INTRO:
          this._drawMessage('Для начала игры нажмите пробел');
          break;
      }
    },

    /**
     * Предзагрузка необходимых изображений для уровня.
     * @param {function} callback
     * @private
     */
    _preloadImagesForLevel: function(callback) {
      if (typeof this._imagesArePreloaded === 'undefined') {
        this._imagesArePreloaded = [];
      }

      if (this._imagesArePreloaded[this.level]) {
        callback();
        return;
      }

      var levelImages = [];
      this.state.objects.forEach(function(object) {
        levelImages.push(object.sprite);

        if (object.spriteReversed) {
          levelImages.push(object.spriteReversed);
        }
      });

      var i = levelImages.length;
      var imagesToGo = levelImages.length;

      while (i-- > 0) {
        var image = new Image();
        image.src = levelImages[i];
        image.onload = function() {
          if (--imagesToGo === 0) {
            this._imagesArePreloaded[this.level] = true;
            callback();
          }
        }.bind(this);
      }
    },

    /**
     * Обновление статуса объектов на экране. Добавляет объекты, которые должны
     * появиться, выполняет проверку поведения всех объектов и удаляет те, которые
     * должны исчезнуть.
     * @param {number} delta Время, прошеднее с отрисовки прошлого кадра.
     */
    updateObjects: function(delta) {
      // Персонаж.
      var me = this.state.objects.filter(function(object) {
        return object.type === ObjectType.ME;
      })[0];

      // Добавляет на карту файрбол по нажатию на Shift.
      if (this.state.keysPressed.SHIFT) {
        this.state.objects.push({
          direction: me.direction,
          height: 24,
          speed: 5,
          sprite: 'img/fireball.gif',
          type: ObjectType.FIREBALL,
          width: 24,
          x: me.direction & Direction.RIGHT ? me.x + me.width : me.x - 24,
          y: me.y + me.height / 2
        });

        this.state.keysPressed.SHIFT = false;
      }

      this.state.garbage = [];

      // Убирает в garbage не используемые на карте объекты.
      var remainingObjects = this.state.objects.filter(function(object) {
        ObjectsBehaviour[object.type](object, this.state, delta);

        if (object.state === ObjectState.DISPOSED) {
          this.state.garbage.push(object);
          return false;
        }

        return true;
      }, this);

      this.state.objects = remainingObjects;
    },

    /**
     * Проверка статуса текущего уровня.
     */
    checkStatus: function() {
      // Нет нужны запускать проверку, нужно ли останавливать уровень, если
      // заранее известно, что да.
      if (this.state.currentStatus !== Verdict.CONTINUE) {
        return;
      }

      if (!this.commonRules) {
        /**
         * Проверки, не зависящие от уровня, но влияющие на его состояние.
         * @type {Array.<functions(Object):Verdict>}
         */
        this.commonRules = [
          /**
           * Маг прошел вправо на 300 пикселей.
           * @param {Object} state
           * @return {Verdict}
           */
          function movedRight(state) {
            var initialState = this._getInitialLevelState(Level.INTRO);

            var me = this._getMe(state);
            var meAtTheBeginning = this._getMe(initialState);

            if (me.x - meAtTheBeginning.x >= 200) {
              state.customMessage = checkFn([1, 2, 3, 4]);
              return state.customMessage === 'Я прошёл 10 шагов' ? Verdict.WIN : Verdict.FAIL;
            }

            return Verdict.CONTINUE;
          },

          /**
           * Маг прошел влево на 300 пикселей.
           * @param {Object} state
           * @return {Verdict}
           */
          function movedLeft(state) {
            var initialState = this._getInitialLevelState(Level.INTRO);

            var me = this._getMe(state);
            var meAtTheBeginning = this._getMe(initialState);

            if (me.x - meAtTheBeginning.x <= -200) {
              state.customMessage = checkFn([1, 2, 3, 4], [4, 3, 2, 1]);
              return state.customMessage === 'Я прошёл 20 метров' ? Verdict.WIN : Verdict.FAIL;
            }

            return Verdict.CONTINUE;
          },

          /**
           * Маг поднялся до верха экрана.
           * @param {Object} state
           * @return {Verdict}
           */
          function movedUp(state) {
            var me = this._getMe(state);
            if (me.y <= 10) {
              state.customMessage = checkFn(2);
              return state.customMessage === 'Я прыгнул на 200 сантиметров' ? Verdict.WIN : Verdict.FAIL;
            }

            return Verdict.CONTINUE;
          },

          /**
           * Произведен выстрел и он попал в дерево.
           * @param {Object} state
           * @return {Verdict}
           */
          function hitTheTree(state) {
            /**
             * @const
             * @type {number}
             */
            var LOW_COORD = HEIGHT * 0.5;

            /**
             * @const
             * @type {number}
             */
            var TOP_COORD = HEIGHT * 0.75;

            /**
             * @param {Object} fireball
             * @return {boolean}
             */
            function isHitTheTree(fireball) {
              return !!(fireball.direction & Direction.RIGHT) &&
                  fireball.x >= WIDTH - 10 &&
                  fireball.y >= LOW_COORD &&
                  fireball.y <= TOP_COORD;
            }

            var fireball;

            if (state.garbage.length) {
              var disposedFireballs = state.garbage.filter(function(item) {
                return item.type === ObjectType.FIREBALL;
              });

              if (disposedFireballs.length) {
                fireball = disposedFireballs[0];
              }
            }

            if (fireball) {
              var isHit = isHitTheTree(fireball);
              state.customMessage = checkFn(isHit, 'крону дерева');

              if (isHit) {
                return state.customMessage === 'Я попал в крону дерева' ? Verdict.WIN : Verdict.FAIL;
              } else {
                return state.customMessage === 'Я никуда не попал' ? Verdict.WIN : Verdict.FAIL;
              }
            }

            return Verdict.CONTINUE;
          },

          /**
           * Если нажата клавиша Esc игра ставится на паузу.
           * @param {Object} state
           * @return {Verdict}
           */
          function checkKeys(state) {
            return state.keysPressed.ESC ? Verdict.PAUSE : Verdict.CONTINUE;
          }
        ];
      }

      // Проверка всех правил влияющих на уровень. Запускаем цикл проверок
      // по всем универсальным проверкам и проверкам конкретного уровня.
      // Цикл продолжается до тех пор, пока какая-либо из проверок не вернет
      // любое другое состояние кроме CONTINUE или пока не пройдут все
      // проверки. После этого состояние сохраняется.
      var allChecks = this.commonRules.concat(LevelsRules[this.level]);
      var currentCheck = Verdict.CONTINUE;
      var currentRule;

      while (currentCheck === Verdict.CONTINUE && allChecks.length) {
        currentRule = allChecks.shift();
        currentCheck = currentRule.call(this, this.state);
      }

      this.state.currentStatus = currentCheck;
    },

    /**
     * Принудительная установка состояния игры. Используется для изменения
     * состояния игры от внешних условий, например, когда необходимо остановить
     * игру, если она находится вне области видимости и установить вводный
     * экран.
     * @param {Verdict} status
     */
    setGameStatus: function(status) {
      if (this.state.currentStatus !== status) {
        this.state.currentStatus = status;
      }
    },

    /**
     * Отрисовка всех объектов на экране.
     */
    render: function() {
      // Удаление всех отрисованных на странице элементов.
      this.ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Выставление всех элементов, оставшихся в this.state.objects согласно
      // их координатам и направлению.
      this.state.objects.forEach(function(object) {
        if (object.sprite) {
          var image = new Image(object.width, object.height);
          image.src = (object.spriteReversed && object.direction & Direction.LEFT) ?
              object.spriteReversed :
              object.sprite;
          this.ctx.drawImage(image, object.x, object.y, object.width, object.height);
        }
      }, this);
    },

    /**
     * Основной игровой цикл. Сначала проверяет состояние всех объектов игры
     * и обновляет их согласно правилам их поведения, а затем запускает
     * проверку текущего раунда. Рекурсивно продолжается до тех пор, пока
     * проверка не вернет состояние FAIL, WIN или PAUSE.
     */
    update: function() {
      if (!this.state.lastUpdated) {
        this.state.lastUpdated = Date.now();
      }

      var delta = (Date.now() - this.state.lastUpdated) / 10;
      this.updateObjects(delta);
      this.checkStatus();

      switch (this.state.currentStatus) {
        case Verdict.CONTINUE:
          this.state.lastUpdated = Date.now();
          this.render();
          requestAnimationFrame(function() {
            this.update();
          }.bind(this));
          break;

        case Verdict.WIN:
        case Verdict.FAIL:
        case Verdict.PAUSE:
        case Verdict.INTRO:
        default:
          this.pauseLevel();
          break;
      }
    },

    /**
     * @param {KeyboardEvent} evt
     * @private
     */
    _onKeyDown: function(evt) {
      switch (evt.keyCode) {
        case 37:
          evt.preventDefault();
          this.state.keysPressed.LEFT = true;
          break;
        case 39:
          evt.preventDefault();
          this.state.keysPressed.RIGHT = true;
          break;
        case 38:
          evt.preventDefault();
          this.state.keysPressed.UP = true;
          break;
        case 27:
          evt.preventDefault();
          this.state.keysPressed.ESC = true;
          break;
      }

      if (evt.shiftKey) {
        this.state.keysPressed.SHIFT = true;
      }
    },

    /**
     * @param {KeyboardEvent} evt [description]
     * @private
     */
    _onKeyUp: function(evt) {
      switch (evt.keyCode) {
        case 37:
          this.state.keysPressed.LEFT = false;
          break;
        case 39:
          this.state.keysPressed.RIGHT = false;
          break;
        case 38:
          this.state.keysPressed.UP = false;
          break;
        case 27:
          this.state.keysPressed.ESC = false;
          break;
      }

      if (evt.shiftKey) {
        this.state.keysPressed.SHIFT = false;
      }
    },

    /** @private */
    _initializeGameListeners: function() {
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
    },

    /** @private */
    _removeGameListeners: function() {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
    },

    /**
     * Возвращает игрока.
     * @param {Object} state
     * @return {Object}
     * @private
     */
    _getMe: function(state) {
      return state.objects.filter(function(object) {
        return object.type === ObjectType.ME;
      })[0];
    },

    /**
     * Возвращает начальное состояние каждого из уровней.
     * @param {Level} level
     * @return {Object}
     * @private
     */
    _getInitialLevelState: function(level) {
      var params = this.getInitialState();
      return LevelsInitialize[level](params);
    }
  };

  window.Game = Game;
  window.Game.Verdict = Verdict;

  var game = new Game(document.querySelector('.demo'));
  game.initializeLevelAndStart();
  game.setGameStatus(Game.Verdict.CONTINUE);

  var clouds = document.querySelector('.header-clouds');

  function checkGameVisibility() {
    var containerBox = game.container.getBoundingClientRect();
    if (containerBox.bottom < HEIGHT * 0.75 || containerBox.top > window.innerHeight - HEIGHT * 0.5) {
      game.setGameStatus(Game.Verdict.PAUSE);
    }
  }

  var timeout;
  var isRunning = false;
  var lastTime;
  //var lastDelta = 0;

  function syncClouds() {
    var cloudsBox = clouds.getBoundingClientRect();
    if (cloudsBox.bottom > 0) {
      clouds.style.backgroundPositionX = -document.body.scrollTop / 2 + 'px';
    }
  }

  window.addEventListener('scroll', function(/*evt*/) {
    if (!lastTime) {
      lastTime = Date.now();
    }

    if (!isRunning) {
      isRunning = true;
      requestAnimationFrame(function(/*delta*/) {
        syncClouds();
        isRunning = false;
        //console.log(delta - lastDelta);
        //lastDelta = delta;
      });
    }

    //console.log(Date.now() - lastTime);

    clearTimeout(timeout);
    timeout = setTimeout(checkGameVisibility, 100);
    lastTime = Date.now();
  });

  syncClouds();
})();
