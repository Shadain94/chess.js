//var boardPieces;
var game;
var pieceIds;
var file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
//var ids = ["RQ", "NQ", "BQ", "Q", "K", "BK", "NK", "RK"];
//var values = [5, 3, 3.5, 9, 39, 3.5, 3, 5];
var abc = {a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7};
var typeIds = {P:1, N:2, B:3, R:4, Q:5, K:6};
var color = ['w', 'b'];
var color2 = ['W', 'B'];
var colorToSide = {W:0, B:1};
var moveHistory;
var pieceTypes = ['-', 'P', 'N', 'B', 'R', 'Q', 'K'];
var gameNotation;
var boardTable = {};
var noPiece = 0;
var bestMoves;
var numCalls = {eval:0,evalB:0, p:0, k:0, n:0, moves:0, check:0, umt:0, umtm:0, fcp:0, upInit:0, upFinal:0, fcpm:0};
var currentSide, pendingMove;
function init(){
	moveHistory=[];
	gameNotation = [];
	currentSide=1;
	pendingMove = false;
	pieceIds = [];
	for(var i=0; i<8; i++){
		pieceIds[i] = pieceToNum(order[i], 0);
		pieceIds[i+8] 	= 1;

		pieceIds[i+16] 	= 0;
		pieceIds[i+24] 	= 0;
		pieceIds[i+32] 	= 0;
		pieceIds[i+40] 	= 0;

		pieceIds[i+48] 	= -1;
		pieceIds[i+56] = pieceToNum(order[i], 1);
	}
	

	game = [pieceIds.slice()];
	setupBoard(pieceIds);
	updateStatus();
}

function pieceToNum(type, side){
	var direction = 1;
	var typeNum;
	if(side === 1){direction = -1;}
	switch(type){
		case "P":typeNum = 1; break;
		case "N": typeNum = 2; break;
		case "B": typeNum = 3; break;
		case "R": typeNum = 4; break;
		case "Q": typeNum = 5; break;
		case "K": typeNum = 6; break;
	}
	return typeNum*direction;
}
function undo(){
	document.getElementById("moves").innerHTML="";
	if(game.length>1){
		currentSide = 1-currentSide;
		game.pop();
		moveHistory.pop();
		gameNotation.pop();
		pieceIds = game[game.length-1].slice();
		setupBoard(pieceIds);
		updateStatus();
	}
}
function play(){
    var level = parseInt(document.getElementById("level").value);
	bestMoves = findBestMoves(pieceIds, currentSide, level, level, -100, 100);
	console.log(pieceIds);
	if(bestMoves.length>0){
		var bestMove = bestMoves[Math.floor(bestMoves.length*Math.random())];
		applyMove(bestMove);
	}
	updateStatus();
}

function findValidMoves(pieceIds, noCheckAllowed){
	var validMoves = [];
	for(var i=0; i<pieceIds.length; i++){
		validMoves.push(findValidPieceMoves(pieceIds,getPosFromId(i),noCheckAllowed));
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

function groupPieceIdsByType(pieceIds){
	var types = [[],[],[],[],[],[]];
	for(var i=0; i<pieceIds.length; i++){
		if(pieceIds[i]!=0){
			types[Math.abs(pieceIds[i]) - 1].push(i);
		}
	}
	return types;
}

function evaluateScore(pieceIds,validMoves, side){
	var scores = evaluateBoard(pieceIds,validMoves);
	var score;
	if(side===0){
		score = scores[0] - scores[1];
	}else{
		score = scores[1] - scores[0];
	}		
	return score;
}

function findAllPieceMoves(position, pieceId){
	var pos = position;
	var typeId = Math.abs(pieceId);
	var pieceType = pieceTypes[typeId];
	var positions = [];
	var vectors;

	var possibleMove;
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
			for(var i=0; i<numPaths; i++){
				pos = position;
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
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'K':
			var options = [[1, 0],[1, 1],[0, 1],[-1, 1],[-1, 0],[-1, -1],[0, -1],[1, -1]];
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
				if(possibleMove!==undefined){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'P':
			var options = [[0, typeId],[0, 2*typeId],[-1, typeId],[1, typeId]];
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

function checkRelations(posArray, pieceType){
  var valid;
	if(pieceType==='R'){
		valid = true;
		for(var i=1; i<posArray.length; i++){
			if(posArray[i][0]!=posArray[0][0]){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<posArray.length; i++){
				if(posArray[i][1]!=posArray[0][1]){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='B'){
		valid = true;
		for(var i=1; i<posArray.length; i++){
			if(findCol(posArray[i][0]) + parseInt(posArray[i][1])!=findCol(posArray[0][0]) + parseInt(posArray[0][1])){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<posArray.length; i++){
				if(findCol(posArray[i][0]) - parseInt(posArray[i][1])!=findCol(posArray[0][0]) - parseInt(posArray[0][1])){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='Q'){
		return checkRelations(posArray, 'R') || checkRelations(posArray, 'B');
	}else{
		return false;
	}
	
}

function parseObject(objStr){
	return JSON.parse(objStr);
}

function posToNum(pos){
	return findCol(pos[0])+(pos[1]-1)*8;
}

function findBestMoves(pieceIds, side, depth,maxDepth, a, b){
	var bestScore = -1000;
	var bestMoves = [];
	var allOptions;
	var validMove;
	var numMoves, numCaptures;
	var initPos, newScore;
	var totalMoves;
	var replies;
	var movingPiece;
	var unknownPiece;
	var oppKingId;
	//var validMoves2 = [];
	//var boardTypes = groupPieceIdsByType(pieceIds);
	var validMoves = findValidMoves(pieceIds, depth==maxDepth);
	var pieceIds2 = [];
	var pieceId;
	for(var i=0; i<pieceIds.length; i++){
		pieceId = pieceIds[i];
		if(pieceId/side>0){
			//validMoves2 = JSON.parse(JSON.stringify(validMoves));
			allOptions = validMoves[i];
			initPos = getPosFromId(i);
			/*
			var unknownPieces1 = findControllingPieces(pieceIds, boardTypes, initPos);
			pieceIds[i]=noPiece;
			for(var j=0; j<unknownPieces1.length; j++){
				validMoves2[unknownPieces1[j]] = findValidPieceMoves(pieceIds,unknownPieces1[j], false);	
				numCalls.upInit++;
			}
			*/
			//pieceIds[i]=pieceId;
			numMoves = allOptions[0].length;
			numCaptures = allOptions[1].length;
			for(var j=0; j<numCaptures; j++){
				allOptions[0].push(allOptions[1][j]);
			}
			totalMoves = allOptions[0].length;
			//var validMoves3 = [];
			for(var j=0; j<totalMoves; j++){
				validMove = allOptions[0][j];
				pieceIds2 = pieceIds.slice();
				//validMoves3 = validMoves2.slice();
				//boardTypes2 = boardTypes.slice();
				makeMove(pieceIds2, {origin:initPos, dest:validMove, pieceId:pieceId});
				if(depth>1){
					replies = findBestMoves(pieceIds2,-side, depth-1, maxDepth, -b, -a);
					if(replies.length>0){
						newScore = - replies[0].score;
					}else{
						newScore = 1000;
					}
				}else{
					newScore = evaluateScore(pieceIds2,findValidMoves(pieceIds2, depth==maxDepth), side);
				}
				if(newScore>bestScore){
					bestScore = newScore;
					bestMoves = [];
				}
				if(newScore>=bestScore){
					bestMoves.push({origin:initPos, dest:validMove, pieceId:pieceId, score:newScore});
				}
				if(bestScore>a){a = bestScore;}
				if(a>=b){ return bestMoves;}
			}				
		}
	}
	return bestMoves;	
}
function updateStatus(){
	var scores = deepEvaluation(pieceIds);
	document.getElementById("history").innerHTML = gameNotation.join(" ");
	document.getElementById("scores").innerHTML="White: "+scores[0]+", Black: "+scores[1];
	if(detectCheck(pieceIds,1) || detectCheck(pieceIds, -1)){
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


function makeMove(pieceIds, move){
	var captureMade = false;
	var id = move.pieceId;
	var side = Math.sign(id);
	var type = Math.abs(id);
	pieceIds[posToNum(move.origin)] = noPiece;
	if(pieceIds[posToNum(move.dest)]!==noPiece){
		captureMade = true;
	}
	pieceIds[posToNum(move.dest)] = move.pieceId;
	
	if(Math.abs(move.origin[1] - move.dest[1])===1 && Math.abs(findCol(move.origin[0]) - findCol(move.dest[0]))===1 && !captureMade && type===typeIds.P){
		//validMoves[posToNum(move.dest[0]+move.origin[1])] = [];
		pieceIds[posToNum(move.dest[0]+move.origin[1])] = noPiece;
	}
	if(move.origin==="e"+move.origin[1] && move.dest==="c"+move.origin[1] && type===typeIds.K){
		pieceIds[posToNum("a"+move.origin[1])] = noPiece;
		pieceIds[posToNum("d"+move.origin[1])] = side*typeIds.R;
	}	
	if(move.origin==="e"+move.origin[1] && move.dest==="g"+move.origin[1] && move.pieceId[1]==='K'){
		pieceIds[posToNum("h"+move.origin[1])] = noPiece;
		pieceIds[posToNum("f"+move.origin[1])] = side*typeIds.R;
	}
	if((side===-1 && move.dest[1]==="1") || (side===1 && move.dest[1]==="8")){
		if(type===typeIds.P){
			pieceIds[posToNum(move.dest)] = side*typeIds.Q;
		}
	}
	/*
	var unknownPieces2 = findControllingPieces(pieceIds,boardTypes, move.dest);
	for(var k=0; k<unknownPieces2.length; k++){
		//validMoves[unknownPieces2[k]] = findValidPieceMoves(pieceIds,unknownPieces2[k], false);	
		numCalls.upFinal++;
	}
	validMoves[posToNum(move.dest)] = findValidPieceMoves(pieceIds, move.dest, false);
	*/
}


function getNotation(pieceIds, move){
	var promotion = "";
	var finalPosId = pieceIds[posToNum(move.dest)];
	var capture = "";
	var typeId = Math.abs(move.pieceId);
	var side = Math.sign(move.pieceId);
	var pieceType = pieceTypes[typeId];
	var idLetters = pieceType;

	if(finalPosId!==noPiece){
		capture="x";
	}else{
		if(Math.abs(move.origin[1] - move.dest[1])===1 && Math.abs(findCol(move.origin[0]) - findCol(move.dest[0]))===1 && typeId===typeIds.P){
			return move.origin[0]+"x"+move.dest+"e.p.";
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=move.origin[0];}else{idLetters="";}
		if(move.dest[1]=="1" || move.dest[1]=="8"){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(pieceType=="R" || pieceType=="Q" || pieceType=="B" || pieceType=="N"){
		var moves;
		var initPositions = [];
		pieceIds[posToNum(move.dest)] = - move.pieceId;
		var capturePositions = findValidPieceMoves(pieceIds,move.dest,true)[1];
		for(var i=0; i<capturePositions.length; i++){
			if(Math.abs(pieceIds[capturePositions[i]])===typeId){
				initPositions.push(capturePositions[i]);
			}
		}		
		pieceIds[posToNum(move.dest)] = finalPosId;
		var sameFile = false;
		var sameRank = false;
		for(var i=0; i<initPositions.length; i++){
			if(initPositions[i][0]==move.origin[0]){
				sameFile = true;
			}
			if(initPositions[i][1]==move.origin[1]){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=move.origin[0];}
			else if(!sameRank){idLetters+=move.origin[1];}
			else{
				idLetters+=move.origin;
			}
		}
	}
	if(pieceType==="K" && move.origin[0]=="e"){
		if(move.dest[0]=="g"){
			return "O-O";
		}else if(move.dest[0]=="c"){
			return "O-O-O";
		}
	}

	return idLetters+capture+move.dest+promotion;
}


function applyMove(move){
	gameNotation.push(getNotation(pieceIds, move));
	makeMove(pieceIds, move);
	moveHistory.push(move);
	currentSide = - currentSide;
	game.push(pieceIds);
	setupBoard(pieceIds);
	updateStatus();
	doPlay();
}

function startMove(initPos, side){
	if(side===currentSide && !pendingMove){
		pendingMove = true;
		document.getElementById("piece-"+initPos).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(pieceIds, initPos, true);
		highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.clientX,event.clientY);
			if(cell!==initPos){
				var valid = false;
				for(var i=0; i<possibleRays.length; i++){
					for(var j=0; j<possibleRays[i].length; j++){
						if(possibleRays[i][j]===cell){
							valid = true;
						}	
					}
				}
				if(valid){
					applyMove({pieceId:pieceIds[posToNum(initPos)], origin:initPos, dest:cell});
				}else{
					document.getElementById("piece-"+initPos).style.WebkitFilter='none';
					
					document.removeEventListener('mouseup', fmove);
				}
				document.getElementById("moves").innerHTML="";	
			}
			pendingMove=false;
			document.removeEventListener('mouseup', fmove);
		});
	}
}

function validMove(pieceIds,move, checkCapture){
	var initPos = move.origin;
	var valid = true;
	var captured;
	var j = pieceIds[posToNum(move.dest)];
	pieceIds[posToNum(move.dest)]=move.pieceId;
	pieceIds[posToNum(initPos)]=noPiece;
	if(detectCheck(pieceIds, Math.sign(move.pieceId))){
		valid = false;
	}
	pieceIds[posToNum(move.dest)]= noPiece;
	pieceIds[posToNum(initPos)]=move.pieceId;
	
	if(checkCapture){
		if(j!==noPiece){
			pieceIds[posToNum(move.dest)] = j;
		}	
	}
	return valid;
}

function findValidKingMoves(pieceIds, position, noCheckAllowed){
	numCalls.k++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[posToNum(position)];
	var side = Math.sign(pieceId);
	var options = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
	var p, possibleMove;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
		if(possibleMove!==undefined){
			p = pieceIds[posToNum(possibleMove)];
			if(noCheckAllowed){
				if(validMove(pieceIds, {origin:position, dest:possibleMove, pieceId:pieceId}, true)){
					if(p===noPiece){
						positions[0].push(possibleMove);
					}else if(p/pieceId<0){
						positions[1].push(possibleMove);
					}		
				}
			}else{
				if(p===noPiece){
					positions[0].push(possibleMove);
				}else if(p/pieceId<0){
					positions[1].push(possibleMove);
				}
			}
		}
	}	
	if(noCheckAllowed){
		var kingLeftPos = adjustPosition(pos, -2, 0);
		var kingRightPos = adjustPosition(pos, 2, 0);				
		var leftRookPos, rightRookPos;
		var row = 4.5-side*3.5;
		leftRookPos = 'a'+row; 
		rightRookPos = 'h'+row;
		if(!detectCheck(pieceIds, side)){
			if(pieceIds[posToNum('b'+row)]===noPiece && pieceIds[posToNum('c'+row)]===noPiece && pieceIds[posToNum('d'+row)]===noPiece && pieceIds[leftRookPos]/side===typeIds.R){
				if(validMove(pieceIds, {origin:position, dest:kingLeftPos, pieceId:pieceId}, false)){
					pieceIds[position] = noPiece;
					pieceIds[position-1] = pieceId;
					if(!detectCheck(pieceIds, side)){
						positions[0].push(kingLeftPos);
					}
					pieceIds[position] = pieceId;
					pieceIds[position-1] = noPiece;
				}
			}
			if(pieceIds[posToNum('f'+row)]===noPiece && pieceIds[posToNum('g'+row)]===noPiece && rightRook!==undefined && !rightRook.moved){
				if(validMove(pieceIds, {origin:position, dest:kingRightPos, pieceId:pieceId}, false)){
					pieceIds[position] = noPiece;
					pieceIds[position+1] = pieceId;
					if(!detectCheck(pieceIds, side)){
						positions[0].push(kingRightPos);
					}
					pieceIds[position] = pieceId;
					pieceIds[position+1] = noPiece;
				}
			}
		}
	}
	return positions;
}

function findValidPawnMoves(pieceIds, position, noCheckAllowed){
	numCalls.p++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[posToNum(pos)];
	var side = Math.sign(pieceId);
	var leftCapturePos, rightCapturePos;

	if(pos[0]!=='a' && pos[1]!=='8' && pos[1]!=='1'){
		leftCapturePos = adjustPosition(pos, -1, side);
		if(pieceIds[posToNum(leftCapturePos)]/side < 0 && (!noCheckAllowed || validMove(pieceIds, {origin:position, dest:leftCapturePos, pieceId:pieceId}, true))){
			positions[1].push(leftCapturePos);	
		}
	}
	if(pos[0]!=='h' && pos[1]!=='8' && pos[1]!=='1'){
		rightCapturePos = adjustPosition(pos, 1, side);
		if(pieceIds[posToNum(rightCapturePos)]/side < 0 && (!noCheckAllowed || validMove(pieceIds, {origin:position, dest:rightCapturePos, pieceId:pieceId},true))){
			positions[1].push(rightCapturePos);	
		}
	}
	if(pos[1]==4.5 + 0.5*side){
		var move = moveHistory[moveHistory.length-1];
		if(move!==undefined){
			var moveDest = move.dest;
			var moveOrigin = move.origin;
			if(moveOrigin[1]=='7' && side===1 || moveOrigin[1]=='2' && side===-1){
				var enPassantLeft = adjustPosition(pos, -1, 0);
				var enPassantRight = adjustPosition(pos, 1, 0);
				var enl = pieceIds[posToNum(enPassantLeft)];
				var enr = pieceIds[posToNum(enPassantRight)];
				
				if(enPassantLeft!==undefined && enl/side==-1 && moveDest===enPassantLeft){
					leftCapturePos = adjustPosition(pos, -1, direction);
					if(!noCheckAllowed){
						positions[1].push(leftCapturePos);
					}else{
						var initPos = position;
						pieceIds[posToNum(leftCapturePos)]=pieceId;
						pieceIds[posToNum(initPos)]=noPiece;
						pieceIds[posToNum(enPassantLeft)]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(leftCapturePos);
						}
						pieceIds[posToNum(enPassantLeft)] = enl;	
						pieceIds[posToNum(leftCapturePos)]= noPiece;
						pieceIds[posToNum(initPos)]=pieceId;
					}
				}
				
				if(enPassantRight!==undefined && enr/side==-1 && moveDest===enPassantRight){
					rightCapturePos = adjustPosition(pos, 1, direction);
					if(!noCheckAllowed){
						positions[1].push(rightCapturePos);
					}else{
						var initPos = position;
						pieceIds[posToNum(rightCapturePos)]=pieceId;
						pieceIds[posToNum(initPos)]=noPiece;
						pieceIds[posToNum(enPassantRight)]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(rightCapturePos);
						}
						pieceIds[posToNum(enPassantRight)] = enr;	
						pieceIds[posToNum(rightCapturePos)]= noPiece;
						pieceIds[posToNum(initPos)]=pieceId;
					}
				}
			}
		}
	}
	var forwardPos = adjustPosition(pos, 0, side);
	if(pieceIds[posToNum(forwardPos)]===noPiece && (!noCheckAllowed || validMove(pieceIds,{origin:pos, dest:forwardPos, pieceId:pieceId}, false))){
		positions[0].push(forwardPos);	
		if(pos[1]==='2' && side===1 || pos[1]==='7' && side===-1){
			var doubleForwardPos = adjustPosition(pos, 0, 2*side); 
			if(pieceIds[posToNum(doubleForwardPos)]===noPiece && (!noCheckAllowed || validMove(pieceIds,{origin:pos, dest:doubleForwardPos, pieceId:pieceId}, false))){
				positions[0].push(doubleForwardPos);	
			}
		}
	}
	return positions;
}

function findValidKnightMoves(pieceIds, position, noCheckAllowed){
	numCalls.n++;
	var positions = [[],[]];
	var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
	var p, possibleMove;
	var pos = position;
	var pieceId = pieceIds[posToNum(position)];
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i][0], options[i][1]);
		if(possibleMove!==undefined){
			p = pieceIds[posToNum(possibleMove)];
			if(noCheckAllowed){
				if(p===noPiece && validMove(pieceIds,{origin:position, dest:possibleMove, pieceId:pieceId}, false)){
					positions[0].push(possibleMove);		
				}else if(p/pieceId<0 && validMove(pieceIds,{origin:position, dest:possibleMove, pieceId:pieceId}, true)){
					positions[1].push(possibleMove);	
				}
			}else{
				if(p===noPiece){
					positions[0].push(possibleMove);		
				}else if(p/pieceId<0){
					positions[1].push(possibleMove);	
				}
			}
		}
	}	
	return positions;
}

function findValidPieceMoves(pieceIds, position, noCheckAllowed){
	numCalls.moves++;
	var positions = [];
	var pieceId = pieceIds[posToNum(position)];
	var typeId = Math.abs(pieceId);
	var side = Math.sign(pieceId);
	var pieceType = pieceTypes[typeId];
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
			var pos = position;
			var p;
			positions.push([]);
			positions.push([]);
			for(var i=0; i<numPaths; i++){
				pos = position;
				p = noPiece;
				while(p===noPiece && pos!==undefined){
					pos = adjustPosition(pos, vectors[i][0], vectors[i][1]);
					if(pos!==undefined){
						p = pieceIds[posToNum(pos)];
						if(noCheckAllowed){		
							if(p===noPiece){
								if(validMove(pieceIds,{origin:position, dest:pos, pieceId:pieceId},false)){
									positions[0].push(pos);
								}
							}else if(p/side<0 && validMove(pieceIds,{origin:position, dest:pos, pieceId:pieceId}, true)){
								positions[1].push(pos);
							}					
						}else{
							if(p===noPiece){
								positions[0].push(pos);
							}else if(p/side<0){
								positions[1].push(pos);
							}	
						}
					}
				}
			}
			break;
		case 'N':
			positions = findValidKnightMoves(pieceIds,position, noCheckAllowed);
			break;
		case 'K':
			positions = findValidKingMoves(pieceIds, position, noCheckAllowed);
			break;
		case 'P':
			positions = findValidPawnMoves(pieceIds, position, noCheckAllowed);
			break;
	default: return [];
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
function pieceValue(typeId){
	var pieceValues = [0, 1, 3, 3.25, 5, 9, 39]; 
	return pieceValues[typeId];
}
function evaluateBoard(pieceIds, validMoves){
	var hash = pieceIds.toString();
  	var scores = [0,0];
	numCalls.evalB++;
	if(boardTable[hash]===undefined){
		var mobilityScore = [0,0];
		var materialScore = [0,0];
		var possibleMoves;
		var index, piece;
		var bCheck, wCheck;
		for(var i=0; i<pieceIds.length; i++){
			if(pieceIds[i]>0){
				possibleMoves = validMoves[i];
				mobilityScore[0]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[0]+= pieceValue(Math.abs(pieceIds[i]));
			}else if(pieceIds[i]<0){
				possibleMoves = validMoves[i];
				mobilityScore[1]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[1]+= pieceValue(Math.abs(pieceIds[i]));
			}
		}
		scores[0] = mobilityScore[0]*0.05+materialScore[0];
		scores[1] = mobilityScore[1]*0.05+materialScore[1];
		numCalls.eval++;
		boardTable[hash] = scores;
    	return scores;
	}else{
		return boardTable[hash];
	}
}
function deepEvaluation(pieceIds){
	var scores = [0, 0];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var possibleMoves;
	for(var i=0; i<pieceIds.length; i++){
			if(pieceIds[i]>0){
				possibleMoves = findValidPieceMoves(pieceIds, getPosFromId(i), true);
				mobilityScore[0]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[0]+= pieceValue(Math.abs(pieceIds[i]));
			}else if(pieceIds[i]<0){
				possibleMoves = findValidPieceMoves(pieceIds, getPosFromId(i), true);
				mobilityScore[1]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[1]+= pieceValue(Math.abs(pieceIds[i]));
			}
		}
	if(mobilityScore[0]===0){
		materialScore[0] = 0;
		if(!detectCheck(pieceIds, 1)){
			mobilityScore[1]=0;
			materialScore[1]=0;
		}
	}
	if(mobilityScore[1]===0){
		materialScore[1] = 0;
		if(!detectCheck(pieceIds, -1)){
			mobilityScore[0]=0;
			materialScore[0]=0;
		}
	}
	scores[0] = mobilityScore[0]*0.05+materialScore[0];
	scores[1] = mobilityScore[1]*0.05+materialScore[1];
	return scores;
}

function findControllingPieces(pieceIds, boardTypes, position){
	var controllingPieces = [];
	var rayPieceTypes = ["R", "B", "Q"];
	numCalls.fcp++;
	var threatType, pieceType, possibleThreats, possibleThreats2, numThreats;
	var pieceId = pieceIds[posToNum(position)];
	for(var j=0; j<3; j++){
		pieceType = rayPieceTypes[j];
		var valid = false;
		var piecesOfType = boardTypes[typeIds[pieceType]];
		for(var i=0; i<piecesOfType.length; i++){
			if(checkRelations([piecesOfType[i], position], pieceType)){
				valid = true;
			}
		}
		if(valid){
			pieceIds[posToNum(position)] = typeIds[pieceType];
			possibleThreats = findValidPieceMoves(pieceIds, position,false)[1];
			pieceIds[posToNum(position)] = -typeIds[pieceType];
			possibleThreats2 = findValidPieceMoves(pieceIds, position,false)[1];
			pieceIds[posToNum(position)] = pieceId;
			numCalls.fcpm++;
			for(var i=0; i<possibleThreats.length; i++){
				pieceId = pieceIds[posToNum()];
				if(pieceId!==noPiece){
					threatType = pieceTypes[Math.abs(pieceId)];
					if(threatType===pieceType){
						controllingPieces.push(possibleThreats[i]);
					}
				}
			}
			
			for(var i=0; i<possibleThreats2.length; i++){
				pieceId = pieceIds[posToNum(possibleThreats2[i])];
				if(pieceId!==noPiece){
					threatType = pieceTypes[Math.abs(pieceId)];
					if(threatType===pieceType){
						controllingPieces.push(possibleThreats2[i]);
					}
				}
			}

		}
	}
	var neighbours = findAllPieceMoves(position, typeIds.K);
	for(var i=0; i<neighbours.length; i++){
		pieceId = pieceIds[posToNum(neighbours[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='K'){
				controllingPieces.push(pieceId);
			}
		}
	}

	var neighbours = findAllPieceMoves(position, typeIds.N);
	for(var i=0; i<neighbours.length; i++){
		pieceId = pieceIds[posToNum(neighbours[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='N'){
				controllingPieces.push(pieceId);
			}
		}
	}

	var pawnMoves1 = findAllPieceMoves(position, typeIds.P);
	var pawnMoves2 = findAllPieceMoves(position, -typeIds.P);
	for(var i=0; i<pawnMoves1.length; i++){
		pieceId = pieceIds[posToNum(pawnMoves1[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='P' && pieceId>0){
				controllingPieces.push(pieceId);
			}
		}
	}
	for(var i=0; i<pawnMoves2.length; i++){
		pieceId = pieceIds[posToNum(pawnMoves2[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='P' && pieceId<0){
				controllingPieces.push(pieceId);
			}
		}
	}

	return controllingPieces;
}

function findPieceId(pieceIds, pieceId){
	for(var i=0; i<pieceIds.length; i++){
		if(pieceIds[i]===pieceId){return i;}
	}
}

function detectCheck(pieceIds,side){
	numCalls.check++;
	var possibleThreats, numThreats;
	var posId = findPieceId(pieceIds, side*typeIds.K);
	var pos = getPosFromId(posId);
	var pLeft = adjustPosition(pos, -1, side);
	var pRight = adjustPosition(pos, 1, side);
	if((pRight!==undefined && pieceIds[posToNum(pRight)] == -typeIds.P*side) || (pLeft!==undefined && pieceIds[posToNum(pLeft)] == -typeIds.P*side)){
		return true;
	} 
	var rayPieceTypes = ["R", "B", "N"];
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = rayPieceTypes[j];
		pieceIds[posId] = side*typeIds[pieceType];
		possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
		pieceIds[posId] = side*typeIds.K;
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[posToNum(possibleThreats[i])];
			if(pieceId!==noPiece){
				threatType = pieceTypes[Math.abs(pieceId)];
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					return true;
				}
			}
		}
	}
	return false;
}

function getPosFromId(id){
	return file[id%8]+((id-(id%8))/8+1);
}

function setupBoard(pieceIds){
	document.getElementById("pieces").innerHTML="";
	for(var i=0; i<pieceIds.length; i++){
		if(pieceIds[i]!=0){
			addPiece(pieceIds[i], getPosFromId(i));
		}
	}
}
function addPiece(pieceId, position){
	var left = (12 + 52*findCol(position[0])).toString();
	var top = (8*52 + 12 - 52*parseInt(position[1])).toString();
	var color;
	if(pieceId<0){
		color = "b";
	}else{
		color = "w";	
	}
	var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
	document.getElementById("pieces").innerHTML+='<img src="'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove(\''+position+'\','+Math.sign(pieceId)+')"></img>';
} 