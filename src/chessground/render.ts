import * as cg from './interfaces'
import { State } from './state'
import * as util from './util'

/**
 * Board diffing and rendering logic. It runs in 3 main steps:
 *   1. Iterate over all DOM elements under board (pieces and squares).
 *     For each element, flag it either as 'same' if current state objet holds the
 *     same element at this DOM position (using board key as position ID) or as
 *     'moved' otherwise. Flagged elements are kept in sets for next steps.
 *     Apply animation and capture changes if necessary.
 *
 *   2. Iterate over all pieces and square objects from State. For each element,
 *   if it was flagged as 'same', do nothing. Otherwise 2 possibilities:
 *     - an equivalent piece or square is found in the corresponding 'moved' set:
 *     reuse it and apply translation change;
 *     - no dom element found in the 'moved' set: create it and append it to the
 *     board element
 *
 *   3. Delete from the DOM all remaining element in the 'moved' sets.
 *
 * These steps ensure that, for each re-rendering, the smallest number of DOM
 * operations are made.
 */
export function renderBoard(d: State, dom: cg.DOM) {
  const boardElement = dom.board
  const asWhite = d.orientation === 'white'
  const posToTranslate = d.fixed ? posToTranslateRel : posToTranslateAbs(dom.bounds)
  const orientationChange = d.prev.orientation && d.prev.orientation !== d.orientation
  d.prev.orientation = d.orientation
  const boundsChange = d.prev.bounds && d.prev.bounds !== dom.bounds
  d.prev.bounds = dom.bounds
  const allChange = boundsChange || orientationChange
  const pieces = d.pieces
  const anims = d.animation.current && d.animation.current.plan.anims
  const capturedPieces = d.animation.current && d.animation.current.plan.captured
  const squares: Map<Key, string> = computeSquareClasses(d)
  const samePieces: Set<Key> = new Set()
  const sameSquares: Set<Key> = new Set()
  const movedPieces: Map<string, cg.PieceNode[]> = new Map()
  const movedSquares: Map<string, cg.SquareNode[]> = new Map()
  const piecesKeys = Object.keys(pieces) as Array<Key>
  let squareClassAtKey, pieceAtKey, anim, captured, translate
  let mvdset, mvd

  let otbTurnFlipChange, otbModeChange, otbChange = false
  if (d.otb) {
    otbTurnFlipChange = d.prev.turnColor && d.prev.turnColor !== d.turnColor
    otbModeChange = d.prev.otbMode && d.prev.otbMode !== d.otbMode
    d.prev.otbMode = d.otbMode
    d.prev.turnColor = d.turnColor
    otbChange = !!(otbTurnFlipChange || otbModeChange)
  }

  // walk over all board dom elements, apply animations and flag moved pieces
  let el = dom.board.firstChild as cg.KeyedNode
  while (el) {
    let k = el.cgKey
    pieceAtKey = pieces[k]
    squareClassAtKey = squares.get(k)
    anim = anims && anims[k]
    captured = capturedPieces && capturedPieces[k]
    if (isPieceNode(el)) {
      // if piece not being dragged anymore, remove dragging style
      if (el.cgDragging && (!d.draggable.current || d.draggable.current.orig !== k)) {
        el.classList.remove('dragging')
        el.classList.remove('magnified')
        translate = posToTranslate(util.key2pos(k), asWhite)
        positionPiece(d, el, el.cgColor, translate)
        el.cgDragging = false
      }
      // remove captured class if it still remains
      if (!captured && el.cgCaptured) {
        el.cgCaptured = false
        el.classList.remove('captured')
      }
      // there is now a piece at this dom key
      if (pieceAtKey) {
        const pieceAtKeyName = pieceNameOf(pieceAtKey)
        // continue animation if already animating and same color
        // (otherwise it could animate a captured piece)
        if (anim && el.cgAnimating && el.cgPiece === pieceAtKeyName) {
          translate = posToTranslate(util.key2pos(k), asWhite)
          translate[0] += anim[1][0]
          translate[1] += anim[1][1]
          el.classList.add('anim')
          positionPiece(d, el, el.cgColor, translate)
        } else if (el.cgAnimating) {
          translate = posToTranslate(util.key2pos(k), asWhite)
          positionPiece(d, el, el.cgColor, translate)
          el.classList.remove('anim')
          el.cgAnimating = false
        }
        // same piece, no change: flag as same
        if (el.cgPiece === pieceAtKeyName && !allChange && !otbChange && (!captured || !el.cgCaptured)) {
          samePieces.add(k)
        }
        // different piece: flag as moved unless it is a captured piece
        else {
          if (captured && pieceNameOf(captured) === el.cgPiece) {
            el.classList.add('captured')
            el.cgCaptured = true
          } else {
            movedPieces.set(el.cgPiece, (movedPieces.get(el.cgPiece) || []).concat(el))
          }
        }
      }
      // no piece: flag as moved
      else {
        movedPieces.set(el.cgPiece, (movedPieces.get(el.cgPiece) || []).concat(el))
      }
    }
    else if (isSquareNode(el)) {
      if (!allChange && squareClassAtKey === el.className) {
        sameSquares.add(k)
      }
      else {
        movedSquares.set(
          el.className,
          (movedSquares.get(el.className) || []).concat(el)
        )
      }
    }
    el = el.nextSibling as cg.KeyedNode
  }

  // walk over all squares in current state object, apply dom changes to moved
  // squares or append new squares
  squares.forEach((squareClass: string, k: Key) => {
    if (!sameSquares.has(k)) {
      mvdset = movedSquares.get(squareClass)
      mvd = mvdset && mvdset.pop()
      if (mvd) {
        mvd.cgKey = k
        translate = posToTranslate(util.key2pos(k), asWhite)
        positionSquare(d, mvd, translate)
      }
      else {
        const se = document.createElement('square') as cg.SquareNode
        se.className = squareClass
        se.cgKey = k
        translate = posToTranslate(util.key2pos(k), asWhite)
        positionSquare(d, se, translate)
        boardElement.insertBefore(se, boardElement.firstChild)
      }
    }
  })

  // walk over all pieces in current state object, apply dom changes to moved
  // pieces or append new pieces
  for (let j = 0, jlen = piecesKeys.length; j < jlen; j++) {
    let k = piecesKeys[j] as Key
    let p = pieces[k]
    const pieceClass = p.role + p.color
    anim = anims && anims[k]
    if (!samePieces.has(k)) {
      mvdset = movedPieces.get(pieceClass)
      mvd = mvdset && mvdset.pop()
      // a equivalent piece was moved
      if (mvd) {
        // apply dom changes
        mvd.cgKey = k
        translate = posToTranslate(util.key2pos(k), asWhite)
        if (anim) {
          mvd.cgAnimating = true
          translate[0] += anim[1][0]
          translate[1] += anim[1][1]
        }
        positionPiece(d, mvd, mvd.cgColor, translate)
      }
      // no piece in moved set: insert the new piece
      else {
        const pe = document.createElement('piece') as cg.PieceNode
        const pName = pieceNameOf(p)
        pe.className = pName
        pe.cgPiece = pName
        pe.cgColor = p.color
        pe.cgKey = k
        translate = posToTranslate(util.key2pos(k), asWhite)
        if (anim) {
          pe.cgAnimating = true
          translate[0] += anim[1][0]
          translate[1] += anim[1][1]
        }
        positionPiece(d, pe, p.color, translate)
        boardElement.appendChild(pe)
      }
    }
  }

  // remove from the board any DOM element that remains in the moved sets
  const rmEl = (e: HTMLElement) => boardElement.removeChild(e)
  movedPieces.forEach(els => els.forEach(rmEl))
  movedSquares.forEach(els => els.forEach(rmEl))
}

export function makeCoords(el: HTMLElement, withSymm: boolean) {
  const coords = document.createDocumentFragment()
  coords.appendChild(renderCoords(util.ranks, 'ranks'))
  coords.appendChild(renderCoords(util.files, 'files' + (withSymm ? ' withSymm' : '')))
  el.appendChild(coords)
}

export function makeSymmCoords(el: HTMLElement) {
  const coords = document.createDocumentFragment()
  coords.appendChild(renderCoords(util.invRanks, 'ranks symm'))
  coords.appendChild(renderCoords(util.invFiles, 'files symm'))
  el.appendChild(coords)
}

function posToTranslateBase(pos: cg.Pos, asWhite: boolean, xFactor: number, yFactor: number): NumberPair {
  return [
    (asWhite ? pos[0] - 1 : 8 - pos[0]) * xFactor,
    (asWhite ? 8 - pos[1] : pos[1] - 1) * yFactor
  ]
}

const posToTranslateAbs = (bounds: ClientRect) => {
  const xFactor = bounds.width / 8
  const yFactor = bounds.height / 8
  return (pos: cg.Pos, asWhite: boolean) => posToTranslateBase(pos, asWhite, xFactor, yFactor)
}

const posToTranslateRel: (pos: cg.Pos, asWhite: boolean) => NumberPair =
  (pos, asWhite) => posToTranslateBase(pos, asWhite, 12.5, 12.5)

function positionPiece(d: State, el: HTMLElement, color: Color, pos: NumberPair) {
  if (d.fixed) {
    el.style.left = pos[0] + '%'
    el.style.top = pos[1] + '%'
  }
  else {
    el.style.transform = util.transform(d, color, util.translate(pos))
  }
}

function positionSquare(d: State, el: HTMLElement, pos: NumberPair) {
  if (d.fixed) {
    el.style.left = pos[0] + '%'
    el.style.top = pos[1] + '%'
  } else {
    el.style.transform = util.translate(pos)
  }
}

function isPieceNode(el: cg.PieceNode | cg.SquareNode): el is cg.PieceNode {
  return el.tagName === 'PIECE'
}
function isSquareNode(el: cg.PieceNode | cg.SquareNode): el is cg.SquareNode {
  return el.tagName === 'SQUARE'
}

function pieceNameOf(p: Piece) {
  return p.role + ' ' + p.color
}

function addSquare(squares: Map<Key, string>, key: Key, klass: string) {
  squares.set(key, (squares.get(key) || '') + ' ' + klass)
}

function computeSquareClasses(d: State): Map<Key, string> {
  const squares = new Map()
  if (d.lastMove && d.highlight.lastMove) d.lastMove.forEach((k) => {
    if (k) addSquare(squares, k, 'last-move')
  })

  if (d.check && d.highlight.check) addSquare(squares, d.check, 'check')
  if (d.selected) {
    addSquare(squares, d.selected, 'selected')
    const dests = d.movable.dests && d.movable.dests[d.selected]
    if (dests) dests.forEach((k) => {
      if (d.movable.showDests) addSquare(squares, k, 'move-dest' + (d.pieces[k] ? ' occupied' : ''))
    })
    const pDests = d.premovable.dests
    if (pDests) pDests.forEach((k) => {
      if (d.movable.showDests) addSquare(squares, k, 'premove-dest' + (d.pieces[k] ? ' occupied' : ''))
    })
  }
  const premove = d.premovable.current
  if (premove) premove.forEach((k) => {
    addSquare(squares, k, 'current-premove')
  })

  if (d.exploding) d.exploding.keys.forEach((k) => {
    addSquare(squares, k, 'exploding' + d.exploding!.stage)
  })
  return squares
}

function renderCoords(elems: Array<number | string>, klass: string) {
  const el = document.createElement('li-coords')
  el.className = klass
  elems.forEach((content: number | string, i: number) => {
    const f = document.createElement('li-coord')
    f.className = i % 2 === 0 ? 'coord-odd' : 'coord-even'
    f.textContent = String(content)
    el.appendChild(f)
  })
  return el
}
