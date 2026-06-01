select concat(firstName,' ',lastName) as Name, position,status,age,height,weight 
from Player
where firstName like '%Zion%' and lastName like '%Young%';

