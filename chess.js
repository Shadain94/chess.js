var boardPieces;
var game;
var file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
var ids = ["QR", "QN", "QB", "Q", "K", "KB", "KN", "KR"];
var values = [5, 3, 3.5, 9, 39, 3.5, 3, 5];
var abc = {a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7};
var color = ['w', 'b'];
var color2 = ['W', 'B'];
var moveHistory;
var gameNotation;
var boardTable = {};
var noPiece = "--";
var bestMoves;
var allowPlay = false;
var numCalls = {eval:0, p:0, k:0, n:0, moves:0, check:0, umt:0, umtm:0, fcp:0};
var currentSide, pendingMove;
function init(){
	boardPieces = {};
	moveHistory=[];
	gameNotation = [];
	currentSide=0;
	pendingMove = false;
	for(var i=0; i<8; i++){
		boardPieces["W"+ids[i]] = {type:order[i], side:0, position:file[i]+'1', id:"W"+ids[i], moved:false, value: values[i]};
		boardPieces["WP"+i] 	= {type:'P', side:0, position:file[i]+'2', id:"WP"+i, moved:false, value:1};
		boardPieces["BP"+i] 	= {type:'P', side:1, position:file[i]+'7', id:"BP"+i, moved:false, value:1};
		boardPieces["B"+ids[i]] = {type:order[i], side:1, position:file[i]+'8', id:"B"+ids[i], moved:false, value: values[i]};
	}
	game = [JSON.parse(JSON.stringify(boardPieces))];
	setupBoard(boardPieces);
	updateStatus();
}
function undo(){
	document.getElementById("moves").innerHTML="";
	if(game.length>1){
		currentSide = 1-currentSide;
		game.pop();
		moveHistory.pop();
		gameNotation.pop();
		boardPieces = JSON.parse(JSON.stringify(game[game.length-1]));
		setupBoard(boardPieces);
		updateStatus();
	}
}
function play(){
    var level = parseInt(document.getElementById("level").value);
	var posIds = findPosIds(boardPieces);
	bestMoves = findBestMoves(boardPieces, posIds, findValidMoves(boardPieces, posIds), currentSide, level, level, -100, 100);
	if(bestMoves.length===0){
		setupBoard(boardPieces);
		updateStatus();
	}else{
		bestMove = bestMoves[Math.floor(bestMoves.length*Math.random())];
		makeMove(bestMove.dest, bestMove.id, currentSide);
	}
}

function findValidMoves(board, pieceIds){
	validMoves = {};
	for(var id in board){
		validMoves[id] = findValidPieceMoves(board[id], board, pieceIds,true);
	}
	return validMoves;
}


function startGame(){
    init();
    doPlay();
}

function doPlay(){
    var compPlayer= document.getElementById("compPlayer").value;
    
    if(compPlayer==currentSide || compPlayer==2){
        document.getElementById("pending").style.visibility = "visible";
        setTimeout(play, 200);
    }else{
        document.getElementById("pending").style.visibility = "hidden";
    }
}

function evaluateScore(board, validMoves, pieceIds, side){
	var scores = evaluateBoard(board,validMoves, pieceIds);
	var score;
	if(side===0){
		score = scores[0] - scores[1];
	}else{
		score = scores[1] - scores[0];
	}		
	return score;
}

function findAllPieceMoves(piece){
	var position = piece.position;
	var pieceType = piece.type;
	var positions = [];
	var vectors;
	var direction=1;
	if(piece.side===1){direction=-1;}
	var numPaths;
	switch(pieceType){
		case 'R': vectors = [[-1, 0], [0, 1], [0, -1], [1, 0]]; numPaths = 4; break;
		case 'B': vectors = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; numPaths = 4; break;
		case 'Q': vectors = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			var pos = piece.position;
			var side = piece.side;
			positions.push([]);
			positions.push([]);
			for(var i=0; i<numPaths; i++){
				pos = piece.position;
				while(pos!==undefined){
					pos = adjustPosition(pos, vectors[i][0], vectors[i][1]);
					if(pos!==undefined){
						positions.push(pos);
					}
				}
			}
			break;
		case 'N':
			var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
			var possibleMove;
			var pos = piece.position;
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'K':
			var options = [[1, 0],[1, 1],[0, 1],[-1, 1],[-1, 0],[-1, -1],[0, -1],[1, -1]];
			var possibleMove;
			var pos = piece.position;
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'P':
			var options = [[0, direction],[0, 2*direction],[-1, direction],[1, direction]];
			var possibleMove;
			var pos = piece.position;
			for(var i=0; i<4; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
	default:
    }	
	return positions;

}

String.prototype.hashCode = function(){
    if (Array.prototype.reduce){
        return this.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
    } 
    var hash = 0;
    if (this.length === 0) return hash;
    for (var i = 0; i < this.length; i++) {
        var character  = this.charCodeAt(i);
		hash  = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function updateMoveTable(validMoves, board, pieceIds, initPos, finalPos){
	numCalls.umt++;
	var unknownPieces1 = findControllingPieces(board, pieceIds, initPos);
	var unknownPieces2 = findControllingPieces(board, pieceIds, finalPos);
	numCalls.umtm+=6;
	for(var i=0; i<unknownPieces1.length; i++){
		numCalls.umtm++;
		validMoves[unknownPieces1[i]] = findValidPieceMoves(board[unknownPieces1[i]], board, pieceIds, false);	
	}
	for(var i=0; i<unknownPieces2.length; i++){
		numCalls.umtm++;
		validMoves[unknownPieces2[i]] = findValidPieceMoves(board[unknownPieces2[i]], board, pieceIds, false);	
	}
	numCalls.umtm++;
	validMoves[pieceIds[finalPos]] = findValidPieceMoves(board[pieceIds[finalPos]], board, pieceIds, false);
}

function findBestMoves(board,pieceIds, validMoves, side, depth,maxDepth, a, b){
	var bestScore = -1000;
	var bestMoves = [];
	var allOptions;
	var captured;
	var validMove;
	var numMoves, numCaptures;
	var initPos, newScore;
	var totalMoves;
	var replies;
	var movingPiece;
	var legalMoves;
	var k;
	var validMoves2 = {};
	var validMovesStr = JSON.stringify(validMoves);
	for(var pieceId in board){
		if(board[pieceId].side==side){
			movingPiece = board[pieceId];
			allOptions = validMoves[pieceId];
			initPos = movingPiece.position;
			numCaptures = allOptions[1].length;
			numMoves = allOptions[0].length;
			for(var i=0; i<numCaptures; i++){
				allOptions[0].push(allOptions[1][i]);
			}
			totalMoves = allOptions[0].length;
			for(var j=0; j<totalMoves; j++){
				validMove = allOptions[0][j];
				validMoves2 = JSON.parse(validMovesStr);
				if(j>=numMoves){
					k = pieceIds[validMove];
					if(k!==noPiece){
						captured = board[k];
						delete validMoves2[k];
						delete board[k];
					}
				}
				board[pieceId].position = validMove;
				pieceIds[validMove] = pieceId;
				pieceIds[initPos]=noPiece;
				updateMoveTable(validMoves2, board, pieceIds, initPos, validMove);
				if(depth>1){
					replies = findBestMoves(board,pieceIds,validMoves2,1-side, depth-1, maxDepth, -b, -a);
					if(replies.length>0){
						newScore = - replies[0].score;
					}else{
						newScore = 1000;
					}
				}else{
					newScore = evaluateScore(board,validMoves2, pieceIds, side);
				}
				if(newScore>bestScore){
					bestScore = newScore;
					bestMoves = [];
				}
				if(newScore>=bestScore){
					bestMoves.push({dest:validMove, id:pieceId, score:newScore});
				}
				
				board[pieceId].position = initPos;
				pieceIds[initPos]=pieceId;
				pieceIds[validMove] = noPiece;
				if(j>=numMoves && k!==noPiece){
					board[k] = captured;
					pieceIds[validMove] = k;

				}
				if(bestScore>a){
					a = bestScore;
				}
				if(a>=b){
					break;
				}
			}				
		}
	}
	
	return bestMoves;	
}
function updateStatus(){
	var pieceIds = findPosIds(boardPieces);
	var scores = deepEvaluation(boardPieces, pieceIds);
	document.getElementById("history").innerHTML = gameNotation.join(" ");
	document.getElementById("scores").innerHTML="White: "+scores[0]+", Black: "+scores[1];
	if(detectCheck(boardPieces,pieceIds,0) || detectCheck(boardPieces,pieceIds, 1)){
		if(scores[0]===0){
			document.getElementById("status").innerHTML="Checkmate! Black wins!";
		}else if(scores[1]===0){
			document.getElementById("status").innerHTML="Checkmate! White wins!";
		}else{
			document.getElementById("status").innerHTML="Check!";
		}
	}else{
		if(scores[0]===0 || scores[1]===0){
			document.getElementById("status").innerHTML="Stalemate!";
		}else{
			document.getElementById("status").innerHTML="";
		}
	}
}
function addPiece(info){
	var left = (12 + 52*findCol(info.position[0])).toString();
	var top = (8*52 + 12 - 52*parseInt(info.position[1])).toString();
	var image = info.type.toLowerCase()+color[info.side];
	document.getElementById("pieces").innerHTML+='<img src="'+image+'.png" id="piece-'+info.side+"-"+info.id+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove(\''+info.id+'\','+info.side+')"></img>';
} 
function movePiece(position, id, side){
	var left = (12 + 52*findCol(position[0])).toString();
	var top = (416 + 12 - 52*parseInt(position[1])).toString();
	document.getElementById("piece-"+side+"-"+id).style = 'position:absolute; left:'+left+'px;top:'+top+'px';
	if(boardPieces[id].position==="e"+position[1] && position==="c"+position[1] && boardPieces[id].type==='K'){
		movePiece("d"+position[1], getPieceIdFromPosition("a"+position[1]), side);
	}	
	if(boardPieces[id].position==="e"+position[1] && position==="g"+position[1] && boardPieces[id].type==='K'){
		movePiece("f"+position[1], getPieceIdFromPosition("h"+position[1]), side);
	}	
	boardPieces[id].position=position;
	boardPieces[id].moved = true;
	if((side===1 && position[1]==="1") || (side===0 && position[1]==="8")){
		if(boardPieces[id].type==='P'){
			var piece = boardPieces[id];
			removePiece(piece);
			piece.type='Q';
			piece.value=9;
			boardPieces[id] = piece;
			addPiece(piece);
		}
	}
} 
function removePiece(info){
	document.getElementById("pieces").removeChild(document.getElementById("piece-"+info.side+"-"+info.id));
	delete boardPieces[info.id];
}
function highlightMoves(rays){
	document.getElementById("moves").innerHTML="";
	var moves;
	for(var i=0; i<rays.length; i++){
		moves = rays[i];
		for(var j=0; j<rays[i].length;j++){
			var left = (8+52*findCol(moves[j][0])).toString();
			var top = (416 + 8-52*parseInt(moves[j][1])).toString();
			document.getElementById("moves").innerHTML+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:52px; width:52px; background-color: rgba(255, 255, 0, 0.2)"></div>';
		}
	}
}
function getCell(x, y){
	var row = Math.ceil((416 - y+10)/52);
	var col = Math.floor((x-10)/52);
	return file[col]+row;
}
function findCol(c){
	return abc[c];
}
function makeMove(cell, id, side){
	var capturedPiece = false;
	var movingPiece = boardPieces[id];
	var moveNotation = getNotation(id, boardPieces,movingPiece.position, cell);
	for(var id2 in boardPieces){
		if(boardPieces[id2]!==undefined && boardPieces[id2].position===cell){
			removePiece(boardPieces[id2]);
			capturedPiece = true;
		}
	}
	if(Math.abs(movingPiece.position[1] - cell[1])===1 && Math.abs(findCol(movingPiece.position[0]) - findCol(cell[0]))===1 && !capturedPiece && movingPiece.type==='P'){
		removePiece(boardPieces[getPieceIdFromPosition(cell[0]+movingPiece.position[1])]);
	}
	
	moveHistory.push({origin: movingPiece.position, dest: cell});
	movePiece(cell, id, side);
	
	document.getElementById("moves").innerHTML="";
	if(currentSide===0){
		currentSide=1;
	}else{currentSide=0;}
	game.push(JSON.parse(JSON.stringify(boardPieces)));
	gameNotation.push(moveNotation);
    updateStatus();
    doPlay();
}

function getNotation(pieceId, board, initPos, finalPos){
	var promotion = "";
	var pieceIds = findPosIds(board);
	var finalPosId = pieceIds[finalPos];
	var capture = "";
	var pieceType=board[pieceId].type;
	var idLetters = pieceType;

	if(finalPosId!==noPiece){
		capture="x";
	}else{
		if(Math.abs(initPos[1] - finalPos[1])===1 && Math.abs(findCol(initPos[0]) - findCol(finalPos[0]))===1 && pieceType=="P"){
			return initPos[0]+"x"+finalPos+"e.p.";
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=initPos[0];}else{idLetters="";}
		if(finalPos[1]=="1" || finalPos[1]=="8"){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(pieceType=="R" || pieceType=="Q" || pieceType=="B" || pieceType=="N"){
		var moves;
		var initPositions = [];
		for(var pieceId2 in board){
			if(board[pieceId2].type==pieceType && board[pieceId2].side==board[pieceId].side && pieceId!=pieceId2){
				moves = findValidPieceMoves(board[pieceId2], board, pieceIds, true);
				if(moves[0].indexOf(finalPos)!==-1 || moves[1].indexOf(finalPos)!==-1){
					initPositions.push(board[pieceId2].position);
				}
			}
		}
		var sameFile = false;
		var sameRank = false;
		for(var i=0; i<initPositions.length; i++){
			if(initPositions[i][0]==initPos[0]){
				sameFile = true;
			}
			if(initPositions[i][1]==initPos[1]){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=initPos[0];}
			else if(!sameRank){idLetters+=initPos[1];}
			else{
				idLetters+=initPos;
			}
		}
	}
	if(pieceType==="K" && initPos[0]=="e"){
		if(finalPos[0]=="g"){
			return "O-O";
		}else if(finalPos[0]=="c"){
			return "O-O-O";
		}
	}

	return idLetters+capture+finalPos+promotion;
}

function startMove(id, side){
	if(side===currentSide && !pendingMove){
		pendingMove = true;
		var movingPiece = boardPieces[id];
		document.getElementById("piece-"+side+"-"+id).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(movingPiece, boardPieces, findPosIds(boardPieces), true);
		highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.clientX,event.clientY);
			if(cell!==movingPiece.position){
				var valid = false;
				for(var i=0; i<possibleRays.length; i++){
					for(var j=0; j<possibleRays[i].length; j++){
						if(possibleRays[i][j]===cell){
							valid = true;
						}	
					}
				}
				if(valid){
					makeMove(cell, id, side);
				}else{
					document.getElementById("piece-"+side+"-"+id).style.WebkitFilter='none';
					document.getElementById("moves").innerHTML="";
					document.removeEventListener('mouseup', fmove);
				}	
			}
			pendingMove=false;
			document.removeEventListener('mouseup', fmove);
		});
	}
}
function getPieceIdFromPosition(pos){
	for(var id in boardPieces){
		if(boardPieces[id].position===pos){
			return id;
		}
	}
	return "--";
}
function findPosIds(board){
	var pieceIds = {};
	for(var i=0; i<8; i++){
		for(var j=0; j<8; j++){
			var position = file[i]+(j+1).toString();	
			pieceIds[position]=noPiece;
		}
	}
	
	for(var id in board){
		pieceIds[board[id].position]=id;
	}
	return pieceIds;
}

function findValidKingMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.k++;
	var positions = [[],[]];
	var pos = piece.position;
	var oppKing;
	var oppSide;
	if(piece.side===0){
		oppKing = board.BK;
		oppSide = "B";
	}else{
		oppKing = board.WK;
		oppSide = "W";
	}
	var options = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
	var p, possibleMove;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
		if(possibleMove!==undefined){
			p = pieceIds[possibleMove];
			if(noCheckAllowed && oppKing!==undefined){
				if(Math.abs(possibleMove[1] - oppKing.position[1])>1 || Math.abs(findCol(possibleMove[0]) - findCol(oppKing.position[0]))>1){
					if(validMove(possibleMove, piece, board, pieceIds, true)){
						if(p===noPiece){
							positions[0].push(possibleMove);
						}else if(p[0]===oppSide){
							positions[1].push(possibleMove);
						}		
					}
				}
			}else{
				if(p===noPiece){
					positions[0].push(possibleMove);
				}else if(p[0]===oppSide){
					positions[1].push(possibleMove);
				}
			}
		}
	}	
	if(!piece.moved && noCheckAllowed){
		var kingLeftPos = adjustPosition(pos, -2, 0);
		var kingRightPos = adjustPosition(pos, 2, 0);				
		var leftRook, rightRook;
		var side = piece.side;
		var row = side*7+1;
		if(side===0){leftRook = board.WQR; rightRook = board.WKR;}
		if(side===1){leftRook = board.BQR; rightRook = board.BKR;}
		if(!piece.moved && !detectCheck(board, pieceIds, side)){
			if(pieceIds['b'+row]===noPiece && pieceIds['c'+row]===noPiece && pieceIds['d'+row]===noPiece && leftRook!==undefined && !leftRook.moved){
				piece.position = adjustPosition(pos, -1, 0);
				if(!detectCheck(board, pieceIds, side) && validMove(kingLeftPos, piece, board, pieceIds, false)){
					positions[0].push(kingLeftPos);
				}
				piece.position = pos;
			}
			
			if(pieceIds['f'+row]===noPiece && pieceIds['g'+row]===noPiece && rightRook!==undefined && !rightRook.moved){
				piece.position = adjustPosition(pos, 1, 0);
				if(!detectCheck(board, pieceIds, side) && validMove(kingRightPos, piece, board, pieceIds, false)){
					positions[0].push(kingRightPos);
				}
				piece.position = pos;
			}
		}
	}
	return positions;
}

function findValidPawnMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.p++;
	var positions = [[],[]];
	var direction, pawnSide;
	var pos = piece.position;
	var side = piece.side;
	var leftCapturePos, rightCapturePos;
	if(side===1){
		direction = -1;
	}else{
		direction = 1;
	}
	pawnSide=color2[1-side];
	var captured;
	
	if(pos[0]!=='a' && pos[1]!=='8' && pos[1]!=='1'){
		leftCapturePos = adjustPosition(pos, -1, direction);
		if(pieceIds[leftCapturePos][0]===pawnSide && (!noCheckAllowed || validMove(leftCapturePos, piece, board, pieceIds, true))){
			positions[1].push(leftCapturePos);	
		}
	}
	if(pos[0]!=='h' && pos[1]!=='8' && pos[1]!=='1'){
		rightCapturePos = adjustPosition(pos, 1, direction);
		if(rightCapturePos!==undefined && pieceIds[rightCapturePos][0]===pawnSide && (!noCheckAllowed || validMove(rightCapturePos, piece, board, pieceIds, true))){
			positions[1].push(rightCapturePos);	
		}
	}
	if((pos[1]==='4' && side===1)||(pos[1]==='5' && side===0)){
		var move = moveHistory[moveHistory.length-1];
		if(move!==undefined){
			var moveDest = move.dest;
			var moveOrigin = move.origin;
			if(moveOrigin[1]=='7' && side===0 || moveOrigin[1]=='2' && side===1){
				var enPassantLeft = adjustPosition(pos, -1, 0);
				var enPassantRight = adjustPosition(pos, 1, 0);
				var enl = pieceIds[enPassantLeft];
				var enr = pieceIds[enPassantRight];
				
				if(enPassantLeft!==undefined && enl[0]===pawnSide && moveDest===enPassantLeft && enl[1]==='P'){
					leftCapturePos = adjustPosition(pos, -1, direction);
					if(!noCheckAllowed){
						positions[1].push(leftCapturePos);
					}else{
						var initPos = piece.position;
						piece.position = leftCapturePos;
						pieceIds[leftCapturePos]=piece.id;
						pieceIds[initPos]=noPiece;
						pieceIds[enPassantLeft]=noPiece;
						captured = board[enl];
						delete board[enl];
						if(!detectCheck(board,pieceIds, piece.side)){
							positions[1].push(leftCapturePos);
						}
						board[enl] = captured;
						pieceIds[enPassantLeft] = enl;	
						piece.position = initPos;
						pieceIds[leftCapturePos]= noPiece;
						pieceIds[initPos]=piece.id;
					}
				}
				
				if(enPassantRight!==undefined && enr[0]===pawnSide && moveDest===enPassantRight && enr[1]==='P'){
					rightCapturePos = adjustPosition(pos, 1, direction);
					if(!noCheckAllowed){
						positions[1].push(rightCapturePos);
					}else{
						var initPos = piece.position;
						piece.position = rightCapturePos;
						pieceIds[rightCapturePos]=piece.id;
						pieceIds[initPos]=noPiece;
						pieceIds[enPassantRight]=noPiece;
						captured = board[enr];
						delete board[enr];
						if(!detectCheck(board,pieceIds, piece.side)){
							positions[1].push(rightCapturePos);
						}
						board[enr] = captured;
						pieceIds[enPassantRight] = enr;	
						piece.position = initPos;
						pieceIds[rightCapturePos]= noPiece;
						pieceIds[initPos]=piece.id;
					}
				}
			}
		}
	}
	var forwardPos = adjustPosition(pos, 0, direction);
	if(pieceIds[forwardPos]===noPiece && (!noCheckAllowed || validMove(forwardPos, piece, board, pieceIds, false))){
		positions[0].push(forwardPos);	
		if(pos[1]==='2' && side===0 || pos[1]==='7' && side===1){
			var doubleForwardPos = adjustPosition(pos, 0, 2*direction); 
			if(pieceIds[doubleForwardPos]===noPiece && (!noCheckAllowed || validMove(doubleForwardPos, piece, board, pieceIds, false))){
				positions[0].push(doubleForwardPos);	
			}
		}
	}
	return positions;
}

function validMove(cell, piece, board, pieceIds, checkCapture){
	var initPos = piece.position;
	var valid = true;
	var captured;
	var j = pieceIds[cell];
	
	if(checkCapture){
		if(j!==noPiece){
			captured = board[j];
			board[j] = undefined;
		}
	}
	
	piece.position = cell;
	pieceIds[cell]=piece.id;
	pieceIds[initPos]=noPiece;
	if(detectCheck(board,pieceIds, piece.side)){
		valid = false;
	}
	pieceIds[cell]= noPiece;
	piece.position = initPos;
	pieceIds[initPos]=piece.id;
	
	if(checkCapture){
		if(j!==noPiece){
			board[j] = captured;
			pieceIds[cell] = j;
		}	
	}
	
	return valid;
}

function findValidKnightMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.n++;
	var positions = [[],[]];
	var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
	var p, possibleMove;
	var oppColor = color2[1-piece.side];
	var pos = piece.position;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
		if(possibleMove!==undefined){
			p = pieceIds[possibleMove];
			if(noCheckAllowed){
				if(p===noPiece && validMove(possibleMove, piece, board, pieceIds, false)){
				positions[0].push(possibleMove);		
				}else if(p[0]===oppColor && validMove(possibleMove, piece, board, pieceIds, true)){
					positions[1].push(possibleMove);	
				}
			}else{
				if(p===noPiece){
					positions[0].push(possibleMove);		
				}else if(p[0]===oppColor){
					positions[1].push(possibleMove);	
				}
			}
			
		}
	}	
	return positions;
}

function findValidPieceMoves(piece, board, pieceIds, noCheckAllowed){
	numCalls.moves++;
	var positions = [];
	var pieceType = piece.type;
	var vectors;
	var numPaths;
	switch(pieceType){
		case 'R': vectors = [[-1, 0], [0, 1], [0, -1], [1, 0]]; numPaths = 4; break;
		case 'B': vectors = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; numPaths = 4; break;
		case 'Q': vectors = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			var pos = piece.position;
			var side = piece.side;
			
			var p;
			positions.push([]);
			positions.push([]);
			for(var i=0; i<numPaths; i++){
				pos = piece.position;
				p = noPiece;
				while(p===noPiece && pos!==undefined){
					pos = adjustPosition(pos, vectors[i][0], vectors[i][1]);
					p = pieceIds[pos];
					if(pos!==undefined){
						if(noCheckAllowed){		
							if(p===noPiece){
								if(validMove(pos, piece, board, pieceIds, false)){
									positions[0].push(pos);
								}
							}else if(board[p].side!=side && validMove(pos, piece, board, pieceIds, true)){
								positions[1].push(pos);
							}					
						}else{
							if(p===noPiece){
								positions[0].push(pos);
							}else if(board[p].side!=side){
								positions[1].push(pos);
							}	
						}
					}
				}
			}
			break;
		case 'N':
			positions = findValidKnightMoves(piece, board, pieceIds, noCheckAllowed);
			break;
		case 'K':
			positions = findValidKingMoves(piece, board, pieceIds, noCheckAllowed);
			break;
		case 'P':
			positions = findValidPawnMoves(piece, board, pieceIds, noCheckAllowed);
			break;
	default:
    }	
	return positions;
}
function adjustPosition(pos, x, y){
	var colNum = findCol(pos[0])+x;
	var rowNum = Number(pos[1])+y;
	if(colNum>=8 || colNum<0 || rowNum>8 || rowNum<=0){
		return undefined;
	}
	return file[colNum]+rowNum;
}
function evaluateBoard(pieces, validMoves, pieceIds){
	
	var hash = JSON.stringify(pieceIds);
	if(boardTable[hash]===undefined){
		var scores = [0, 0];
		var mobilityScore = [0,0];
		var materialScore = [0,0];
		var possibleMoves;
		var index, piece;
		var bCheck, wCheck;
		for(var id in pieces){
			piece = pieces[id];
			index = piece.side;
			possibleMoves = validMoves[id];
			mobilityScore[index]+= possibleMoves[0].length+possibleMoves[1].length;
			materialScore[index]+= piece.value;
		}
		
		if(mobilityScore[0]===0){
			materialScore[0] = 0;
			wCheck = detectCheck(pieces, pieceIds, 0);
			if(!wCheck){
				mobilityScore[1]=0;
				materialScore[1]=0;
			}
		}
		if(mobilityScore[1]===0){
			materialScore[1] = 0;
			bCheck = detectCheck(pieces, pieceIds, 1);
			if(!bCheck){
				mobilityScore[0]=0;
				materialScore[0]=0;
			}
			
		}
		
		scores[0] = mobilityScore[0]*0.05+materialScore[0];
		scores[1] = mobilityScore[1]*0.05+materialScore[1];
		numCalls.eval++;
		boardTable[hash] = scores;
	}else{
		return boardTable[hash];
	}
	return scores;
}
function deepEvaluation(pieces, pieceIds){
	var scores = [0, 0];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var possibleMoves;
	for(var id in pieces){
		var index = pieces[id].side;
		possibleMoves = findValidPieceMoves(pieces[id], pieces, pieceIds, true);
		mobilityScore[index]+= possibleMoves[0].length+possibleMoves[1].length;
		materialScore[index]+= pieces[id].value;
	}
	
	if(mobilityScore[0]===0){
		materialScore[0] = 0;
		if(!detectCheck(pieces,pieceIds, 0)){
			mobilityScore[1]=0;
			materialScore[1]=0;
		}
	}
	if(mobilityScore[1]===0){
		materialScore[1] = 0;
		if(!detectCheck(pieces,pieceIds, 1)){
			mobilityScore[0]=0;
			materialScore[0]=0;
		}
	}
	scores[0] = mobilityScore[0]*0.05+materialScore[0];
	scores[1] = mobilityScore[1]*0.05+materialScore[1];
	return scores;
}

function findControllingPieces(board, pieceIds, position){
	var pos = position;
	var controllingPieces = [];
	var pieceTypes = ["R", "B", "N"];
	numCalls.fcp++;
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = pieceTypes[j];
		testPiece = {type:pieceType, side:2, position:position};
		possibleThreats = findValidPieceMoves(testPiece, board, pieceIds, false)[1];
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[possibleThreats[i]];
			if(pieceId!==noPiece){
				threatType = board[pieceId].type;
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					controllingPieces.push(pieceId);
				}
			}
		}
	}
	testPiece = {type:"K", position:position};
	var neighbours = findAllPieceMoves(testPiece);
	for(var i=0; i<neighbours.length; i++){
		pieceId = pieceIds[neighbours[i]];
		if(pieceId!==noPiece){
			threatType = board[pieceId].type;
			if(threatType==='K'){
				controllingPieces.push(pieceId);
			}
		}
	}
	testPiece = {type:"P", position:position, side:0};
	var pawnMoves1 = findAllPieceMoves(testPiece);
	testPiece = {type:"P", position:position, side:1};
	var pawnMoves2 = findAllPieceMoves(testPiece);
	for(var i=0; i<pawnMoves1.length; i++){
		pieceId = pieceIds[pawnMoves1[i]];
		if(pieceId!==noPiece){
			threatType = board[pieceId].type;
			if(threatType==='P'){
				controllingPieces.push(pieceId);
			}
		}
	}
	for(var i=0; i<pawnMoves2.length; i++){
		pieceId = pieceIds[pawnMoves2[i]];
		if(pieceId!==noPiece){
			threatType = board[pieceId].type;
			if(threatType==='P'){
				controllingPieces.push(pieceId);
			}
		}
	}

	return controllingPieces;
}

function detectCheck(pieces, pieceIds,side){
	numCalls.check++;
	var kingPos;
	var direction;
	if(side===0){direction = 1;}else{direction = -1;}
	if(side===0){
		if(pieces.WK==undefined){
			return true;
		}
		kingPos = pieces.WK.position;
	}else{
		if(pieces.BK==undefined){
			return true;
		}
		kingPos = pieces.BK.position;
	}
	var possibleThreats, numThreats;
	var pos = kingPos;
	var pLeft = adjustPosition(pos, -1, direction);
	var pRight = adjustPosition(pos, 1, direction);
	var id1 = pieceIds[pRight];
	var id2 = pieceIds[pLeft];
	if((pRight!==undefined && id1!==noPiece && pieces[id1].side!==side && pieces[id1].type=='P') || (pLeft!==undefined && id2!==noPiece && pieces[id2].side!==side && pieces[id2].type=='P')){
		return true;
	} 
	var pieceTypes = ["R", "B", "N"];
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = pieceTypes[j];
		testPiece = {type:pieceType, side:side, position:kingPos};
		possibleThreats = findValidPieceMoves(testPiece, pieces, pieceIds, false)[1];
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[possibleThreats[i]];
			if(pieceId!==noPiece){
				threatType = pieces[pieceId].type;
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					return true;
				}
			}
		}
	}
	return false;
}
function setupBoard(pieces){
	document.getElementById("pieces").innerHTML="";
	for(var pieceId in pieces){
		addPiece(pieces[pieceId]);
	}
}