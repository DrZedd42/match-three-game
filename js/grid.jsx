import Gem from './gem.jsx';
import Game from './game.jsx';
import _lang from 'lodash/lang';
import _util from 'lodash/util';
import Options from './options.js';
const debug = Options.debug;

/*
  Grid position is going from top to bottom and left to right
  ie a 2x2 grid would have the positions like so
  -----
  |1|3|
  |2|4|
  ----
*/

class GridElement{
  get gridPos(){ return this._gridPos; }
  set gridPos(v){ return; } //dont want this settable externally

  get gemPos() { return { x : this.xPos, y : this.yPos }; }
  set gemPos(v){ return; }

  get gem(){ return this._gem; }
  set gem(newGem){
    if(!_lang.isNull(newGem)){
      this._gem = newGem;
      this._gem.reposition(this.xPos, this.yPos);
      this._gem.clickCallback = this.onGemClick.bind(this);
    }
  }

  constructor(xPos, yPos, gridPos, gridClickCallback, parent){
    this.xPos = xPos;
    this.yPos = yPos;
    this._gridPos = gridPos;
    this.gridClickCallback = gridClickCallback;
    this.parent = parent;

    this._gem = new Gem(this.xPos, this.yPos, this.onGemClick.bind(this));
  }

  onGemClick(sprite, ptr){
    if(debug)console.log('onGemClick called', arguments, this);
    this.gridClickCallback(...arguments, this);
  }

  swapGems(otherGridEl){
    var oldGem = this.gem;
    this.gem = otherGridEl.gem;
    otherGridEl.gem = oldGem;
  }

  onGemMatch(){
    if(debug)console.log('onGemMatch called', arguments, this);
    //may want to do more on a gem match than get a new gem so put
    var newGem = this.gem;
    newGem.hide();
    this.gem = null;

    var nextEl, lastEl = this;
    do{
      while((nextEl = this.parent.up(lastEl.gridPos)) !== null){
        nextEl = this.parent.getElementAt(nextEl);
        lastEl.swapGems(nextEl);
      }

      if(nextEl === null){
        nextEl.gem = newGem;
        newGem.show();
        nextEl.getNewGem();
      }

    }while((lastEl = nextEl) !== null);
  }

  getNewGem(){
    if(debug)console.log('getNewGem called', arguments, this);

    if(Game.instance.loaded){
      debugger;
    }

    this._gem.getNewSprite(this.xPos, this.yPos);
  }
}

class Grid{
  constructor(x, y){
    this.currentSelected = null;
    this.width = x;
    this.height = y;

    var i = 1;
    this.grid = Array(x).fill().map((xVal, xIdx, xArr) => {
      return Array(y).fill().map((yVal, yIdx, yArr) => {
        var xPos = ((xIdx + 1) * Gem.width) - Gem.width,
            yPos = ((yIdx + 1) * Gem.height) - Gem.height;

        return new GridElement(xPos, yPos, i++, this.onGridElementClick.bind(this), this);
      });
    });
  }

  onGridElementClick(sprite, ptr, gridEl){
    if(debug)console.log('onGridElementClick called', arguments, this);

    if(this.currentSelected === null){ //selected an intial gem to move
      if(debug)console.log('select');
      this.currentSelected = gridEl;
    }else if(this.currentSelected === gridEl){ //deselected intial gem
      if(debug)console.log('deselect');
      this.currentSelected = null;
    }else if(this.canSwap(this.currentSelected, gridEl)){
      if(debug)console.log('swap');
      this.currentSelected.swapGems(gridEl);
      Game.instance.checkForMatch(false, this.currentSelected, gridEl);
      this.currentSelected = null;
    }else{
      if(debug)console.log('illegal move');
      this.currentSelected = null;
    }
  }

  checkGrid(setupPhase){
    var allElements = [].concat(...this.grid);
    Game.instance.checkForMatch((_lang.isUndefined(setupPhase) ? false : setupPhase), ...allElements);
  }

  getElementAt(gridPos){
    if(debug)console.log('getElementAt called', arguments, this);

    var xPos = this.getXIndex(gridPos),
        yPos = this.getYindex(gridPos);

    if(debug)console.log('getElementAt', xPos, yPos);

    if(_lang.isUndefined(this.grid[xPos]) || _lang.isUndefined(this.grid[xPos][yPos])){
      return null;
    }

    return this.grid[xPos][yPos];
  }

  /*
  * Get the grid element position above the current position
  * @return {number} the grid position of the element or null if at the bounds of the grid
  */
  up(currentPos){
    var retPos = currentPos - 1,
        bounds = this.getBounds(currentPos);

    if(bounds.top === currentPos){
      return null;
    }

    return retPos;
  }

  /*
  * Get the grid element position below the current position
  * @return {number} the grid position of the element or null if at the bounds of the grid
  */
  down(currentPos){
    var retPos = currentPos + 1,
        bounds = this.getBounds(currentPos);

    if(bounds.bottom === currentPos){
      return null;
    }

    return retPos;
  }

  /*
  * Get the grid element position to the left the current position
  * @return {number} the grid position of the element or null if at the bounds of the grid
  */
  left(currentPos){
    var retPos = currentPos - this.height,
        bounds = this.getBounds(currentPos);

    if(debug)console.log('left called', retPos, arguments, this);

    if(bounds.left === currentPos){
      return null;
    }

    return retPos;
  }

  /*
  * Get the grid element position to the right the current position
  * @return {number} the grid position of the element or null if at the bounds of the grid
  */
  right(currentPos){
    var retPos = currentPos + this.height,
        bounds = this.getBounds(currentPos);

    if(debug)console.log('right called', retPos, arguments, this);

    if(bounds.right === currentPos){
      return null;
    }

    return retPos;
  }

  getBounds(gridPos){
    var currentX = this.getXIndex(gridPos),
        currentY = this.getYindex(gridPos),
        ret = { //FIXME this might be better breaking across lines as there is brackets and arrows everywhere :S
          'top' : gridPos - currentY,
          'bottom' : gridPos + (this.height - (currentY + 1)),
          'left' : ((pos) => (pos <= 0) ? gridPos : pos )(gridPos - this.height),
          'right' : ((pos) => (pos > (this.width * this.height)) ? gridPos : pos )(gridPos + this.height)
        };

    if(debug)console.log('getBounds called', ret, arguments, this);

    return ret;
  }

  getXIndex(gridPos){
    if(debug)console.log('getXIndex called', arguments, this);

    return Math.ceil(gridPos / this.height) - 1;
  }

  getYindex(gridPos){
    if(debug)console.log('getYindex called', arguments, this);

    return ((pos) => pos || this.height)(gridPos % this.height) - 1;
  }

  canSwap(gridEl, otherGridEl){
    if(debug)console.log('onGridElementClick canSwap', arguments, this, gridEl.gridPos, otherGridEl.gridPos);

    return (gridEl.gridPos + this.height) === otherGridEl.gridPos
            || (gridEl.gridPos - this.height) === otherGridEl.gridPos
            || (gridEl.gridPos + 1) === otherGridEl.gridPos
            || (gridEl.gridPos - 1) === otherGridEl.gridPos
  }
}

export default Grid;
