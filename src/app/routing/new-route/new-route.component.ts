import { Component, OnInit } from '@angular/core';

@Component({
  templateUrl: './new-route.component.html',
  styleUrls: ['./new-route.component.css']
})
export class NewRouteComponent implements OnInit {
  persistence = {
    options:
      [
        {displayName: 'Google Drive', key: 'drive'},
        {displayName: 'Browser', key: 'browser'},
        {displayName: 'File system', key: 'files'}
      ],
    selected: -1
  };
  constructor() {}

  ngOnInit() {
  }

  selectPersistence(selectedIndex: number) {
    this.persistence.selected = selectedIndex;
  }

}
